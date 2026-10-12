FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props ./
COPY backend/ ./backend/
ARG PROJECT=VortexFarma.Api
RUN dotnet publish backend/src/${PROJECT}/${PROJECT}.csproj -c Release -o /app
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./
ARG PROJECT=VortexFarma.Api
ENV PROJECT_NAME=${PROJECT} ASPNETCORE_URLS=http://+:8080
RUN mkdir -p /keys && chown $APP_UID /keys
USER $APP_UID
ENTRYPOINT ["sh", "-c", "exec dotnet ${PROJECT_NAME}.dll \"$@\"", "--"]
