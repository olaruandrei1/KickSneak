namespace KickSneak.Domain.DTOs.Nav;

public record FooterLinkDto(string Label, string Href);
public record FooterColumnDto(string Title, List<FooterLinkDto> Links);
public record FooterSocialDto(string Platform, string Href);

public record FooterDto(
    List<FooterColumnDto> Columns,
    List<FooterSocialDto> Social,
    List<FooterLinkDto> Legal,
    string Copyright
);