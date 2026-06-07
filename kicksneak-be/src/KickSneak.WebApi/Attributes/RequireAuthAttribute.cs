namespace KickSneak.WebApi.Attributes;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class RequireAuthAttribute : Attribute;