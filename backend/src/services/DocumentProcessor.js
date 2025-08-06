import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

// Use dynamic imports for CommonJS modules
let pdf, mammoth, xlsx;

async function loadDependencies() {
  if (!pdf) {
    try {
      // Try using require for CommonJS module
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      pdf = require('pdf-parse');
      logger.info('PDF processing library loaded successfully via require');
    } catch (error) {
      logger.error('PDF processing not available via require:', error.message);
      
      // Try dynamic import as fallback
      try {
        const pdfModule = await import('pdf-parse');
        pdf = pdfModule.default || pdfModule;
        logger.info('PDF processing library loaded successfully via import');
      } catch (importError) {
        logger.error('PDF processing not available via import:', importError.message);
        logger.error('Full PDF import error stack:', importError.stack);
        pdf = null;
      }
    }
    
    try {
      mammoth = (await import('mammoth')).default;
    } catch (error) {
      logger.warn('Word document processing not available:', error.message);
      mammoth = null;
    }
    
    try {
      xlsx = (await import('xlsx')).default;
    } catch (error) {
      logger.warn('Excel processing not available:', error.message);
      xlsx = null;
    }
  }
}

export class DocumentProcessor {
  static async extractText(filePath, fileType) {
    try {
      await loadDependencies();
      
      switch (fileType) {
        case '.pdf':
          if (!pdf) {
            throw new Error('PDF processing not available - pdf-parse failed to load');
          }
          return await this.extractPdfText(filePath);
        case '.docx':
          if (!mammoth) {
            throw new Error('Word document processing not available - mammoth failed to load');
          }
          return await this.extractWordText(filePath);
        case '.xlsx':
        case '.xls':
          if (!xlsx) {
            throw new Error('Excel processing not available - xlsx failed to load');
          }
          return await this.extractExcelText(filePath);
        case '.txt':
          return await fs.readFile(filePath, 'utf-8');
        case '.pptx':
          // For now, we'll need a specialized library for PowerPoint
          logger.warn('PowerPoint extraction not yet implemented');
          return '';
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      logger.error(`Error extracting text from ${filePath}:`, error);
      throw error;
    }
  }

  static async extractPdfText(filePath) {
    logger.info(`🔍 PDF: Starting extraction from ${filePath}`);
    logger.info(`🔍 PDF: pdf function available: ${!!pdf}`);
    
    const dataBuffer = await fs.readFile(filePath);
    logger.info(`🔍 PDF: Read ${dataBuffer.length} bytes from file`);
    
    const data = await pdf(dataBuffer);
    logger.info(`🔍 PDF: Extracted ${data.text.length} characters`);
    
    return data.text;
  }


  static async extractWordText(filePath) {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  static async extractExcelText(filePath) {
    const workbook = xlsx.readFile(filePath);
    let text = '';
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetText = xlsx.utils.sheet_to_txt(worksheet);
      text += `\n--- Sheet: ${sheetName} ---\n${sheetText}`;
    });
    
    return text;
  }

  static chunkText(text, options = {}) {
    const {
      maxChunkSize = 1000,
      overlapSize = 100,
      separators = ['\n\n', '\n', '. ', ' ']
    } = options;
    
    const chunks = [];
    let currentChunk = '';
    
    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Keep overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(overlapSize / 5));
          currentChunk = overlapWords.join(' ') + ' ' + paragraph;
        } else {
          // Single paragraph is too long, split it
          const sentences = paragraph.split(/(?<=[.!?])\s+/);
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxChunkSize) {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
              } else {
                // Single sentence is too long, force split
                chunks.push(sentence.substring(0, maxChunkSize));
                currentChunk = sentence.substring(maxChunkSize);
              }
            } else {
              currentChunk += ' ' + sentence;
            }
          }
        }
      } else {
        currentChunk += '\n\n' + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  static estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}