namespace KickSneak.Domain.DTOs.Profile;

public record SizePreferencesDto(
    string FootwearEU,
    string FootwearUS,
    string FootwearUK,
    string Tops,
    string Bottoms,
    string PreferredSystem
);
