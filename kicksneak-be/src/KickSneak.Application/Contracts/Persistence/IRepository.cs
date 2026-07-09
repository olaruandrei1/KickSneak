using System.Linq.Expressions;

namespace KickSneak.Application.Contracts.Persistence;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<T?> GetFirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<T?> GetFirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default, params Expression<Func<T, object>>[] includes);

    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default, params Expression<Func<T, object>>[] includes);

    Task<IReadOnlyList<T>> GetAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default, params Expression<Func<T, object>>[] includes);

    Task<(IReadOnlyList<T> Items, int TotalCount)> GetPaginatedAsync(
        Expression<Func<T, bool>>? predicate = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default
    );

    Task<(IReadOnlyList<T> Items, int TotalCount)> GetPaginatedAsync(
        Expression<Func<T, bool>>? predicate = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default,
        params Expression<Func<T, object>>[] includes
    );

    Task<(IReadOnlyList<T> Items, int TotalCount)> GetPaginatedOrderedAsync<TKey>(
        Expression<Func<T, bool>>? predicate,
        Expression<Func<T, TKey>> orderBy,
        bool descending,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default,
        params Expression<Func<T, object>>[] includes
    );

    Task AddAsync(T entity, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default);

    void Update(T entity);
    void UpdateRange(IEnumerable<T> entities);

    void Delete(T entity);
    void DeleteRange(IEnumerable<T> entities);

    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
}
