# Server Configuration Examples

Your server likely has Apache or Nginx already running on port 80. Here are configurations to proxy your domain to the Docker nginx on port 8080.

## Option 1: Apache Virtual Host (if using Apache)

Create/edit: `/etc/apache2/sites-available/hypercare.zyroi.com.conf`

```apache
<VirtualHost *:80>
    ServerName hypercare.zyroi.com
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/
    
    # Enable proxy modules
    # a2enmod proxy
    # a2enmod proxy_http
    
    ErrorLog ${APACHE_LOG_DIR}/hypercare_error.log
    CustomLog ${APACHE_LOG_DIR}/hypercare_access.log combined
</VirtualHost>
```

Then enable:
```bash
sudo a2ensite hypercare.zyroi.com.conf
sudo systemctl reload apache2
```

## Option 2: Nginx Server Block (if using system Nginx)

Add to `/etc/nginx/sites-available/hypercare.zyroi.com`:

```nginx
server {
    listen 80;
    server_name hypercare.zyroi.com;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # For chat streaming
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }
}
```

Then enable:
```bash
sudo ln -s /etc/nginx/sites-available/hypercare.zyroi.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Option 3: Temporary Direct Access

While setting up the proxy, you can access your app directly:
- `http://hypercare.zyroi.com:8080`

## Option 4: Stop Existing Web Server (if not needed)

If nothing else uses port 80:
```bash
# Check what's using port 80
sudo netstat -tulpn | grep :80

# Stop Apache
sudo systemctl stop apache2
sudo systemctl disable apache2

# OR stop Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Then change docker-compose.prod.yml back to "80:80"
```