FROM nginx:alpine

# Copy all the static HTML, CSS, JS files to the default Nginx html directory
COPY . /usr/share/nginx/html

# Expose port 80 for Railway
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
