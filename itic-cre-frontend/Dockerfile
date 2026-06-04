FROM nginx:1.25-alpine
# On copie directement le dossier de build généré en amont par GitHub
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]