FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# On suppose que le JAR a déjà été généré par GitHub Actions dans le dossier target
COPY target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]