FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Recherche le JAR directement à la racine du contexte de build
COPY *.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]