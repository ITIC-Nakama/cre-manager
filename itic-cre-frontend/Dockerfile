# Étape 1 : Build de l'application
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copier le fichier de configuration Maven et télécharger les dépendances
COPY pom.xml .
RUN mvn -B dependency:go-offline -DskipTests

# Copier les sources et compiler le JAR
COPY src ./src
RUN mvn -B -DskipTests package

# Étape 2 : Exécution de l'application
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Récupérer le JAR compilé à l'étape précédente
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]