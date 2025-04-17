server {
    listen 80;

    location /admin/ {
        proxy_pass http://wallet-admin-botanist-service:3010;
        rewrite ^/admin(/.*)$ $1 break;
    }

    location ^~ /temporal {
        rewrite ^/temporal(/.*)?$ $1 break;
        proxy_pass http://temporal-web:8080;
    }
    
}
