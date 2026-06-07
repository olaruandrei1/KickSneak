namespace KickSneak.Domain.DTOs.Reviews;

public record CreateReviewDto(Guid OrderId, double Score, string? Title, string? Comment);
