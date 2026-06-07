using KickSneak.Application.Contracts.Persistence;
using KickSneak.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace KickSneak.Persistence.Repositories;

public class Repository<T>(AppDbContext context) : IRepository<T> where T : class
{
    protected readonly DbSet<T> _dbSet = context.Set<T>();

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
    => await _dbSet.FindAsync([id], CancellationToken.None);

    public async Task<T?> GetFirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
    => await _dbSet.FirstOrDefaultAsync(predicate, CancellationToken.None);

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default)
    => await _dbSet.ToListAsync(CancellationToken.None);

    public async Task<IReadOnlyList<T>> GetAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
    => await _dbSet.Where(predicate).ToListAsync(CancellationToken.None);

    public async Task<(IReadOnlyList<T> Items, int TotalCount)> GetPaginatedAsync(
        Expression<Func<T, bool>>? predicate = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default
    )
    {
        var query = predicate is null ? _dbSet : _dbSet.Where(predicate);
        var total = await query.CountAsync(CancellationToken.None);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return (items, total);
    }

    public async Task<(IReadOnlyList<T> Items, int TotalCount)> GetPaginatedAsync(
        Expression<Func<T, bool>>? predicate = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default,
        params Expression<Func<T, object>>[] includes
    )
    {
        IQueryable<T> query = _dbSet;

        foreach (var include in includes)
            query = query.Include(include);

        if (predicate is not null)
            query = query.Where(predicate);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return (items, total);
    }

    public async Task AddAsync(T entity, CancellationToken ct = default)
    => await _dbSet.AddAsync(entity, CancellationToken.None);

    public async Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default)
    => await _dbSet.AddRangeAsync(entities, CancellationToken.None);

    public void Update(T entity)
    => _dbSet.Update(entity);

    public void UpdateRange(IEnumerable<T> entities)
    => _dbSet.UpdateRange(entities);

    public void Delete(T entity)
    => _dbSet.Remove(entity);

    public void DeleteRange(IEnumerable<T> entities)
    => _dbSet.RemoveRange(entities);

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default)
    => await _dbSet.AnyAsync(predicate, CancellationToken.None);

    public async Task<IReadOnlyList<T>> GetAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default, params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _dbSet;

        foreach (var include in includes)
            query = query.Include(include);

        return await query.Where(predicate).ToListAsync(CancellationToken.None);
    }

    public async Task<T?> GetFirstOrDefaultAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default, params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _dbSet;

        foreach (var include in includes)
            query = query.Include(include);

        return await query.FirstOrDefaultAsync(predicate, CancellationToken.None);
    }

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default, params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _dbSet;

        foreach (var include in includes)
            query = query.Include(include);

        return await query.ToListAsync(CancellationToken.None);
    }
}
