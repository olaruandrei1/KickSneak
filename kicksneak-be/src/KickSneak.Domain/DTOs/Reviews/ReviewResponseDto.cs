namespace KickSneak.Domain.DTOs.Reviews;

public record ReviewResponseDto(Guid Id, double Score, string? Title, string? Comment, string CreatedAt);
