FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY *.sln .
COPY src/KickSneak.Domain/*.csproj src/KickSneak.Domain/
COPY src/KickSneak.Application/*.csproj src/KickSneak.Application/
COPY src/KickSneak.Infrastructure/*.csproj src/KickSneak.Infrastructure/
COPY src/KickSneak.Persistence/*.csproj src/KickSneak.Persistence/
COPY src/KickSneak.BackgroundServices/*.csproj src/KickSneak.BackgroundServices/
COPY src/KickSneak.WebApi/*.csproj src/KickSneak.WebApi/
RUN dotnet restore

COPY . .
RUN dotnet publish src/KickSneak.WebApi -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .

EXPOSE 5005
ENTRYPOINT ["dotnet", "KickSneak.WebApi.dll"]