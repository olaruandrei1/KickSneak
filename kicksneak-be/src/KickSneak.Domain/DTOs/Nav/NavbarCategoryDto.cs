namespace KickSneak.Domain.DTOs.Nav;

public record NavColumnItemDto(string Label, string Href);
public record NavColumnDto(string Title, List<NavColumnItemDto> Items);

public record NavbarCategoryDto(
    string Id,
    string Label,
    bool Highlight,
    List<NavColumnDto> Columns
);
