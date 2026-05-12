using Microsoft.EntityFrameworkCore;

namespace FiveNine_Collective_Site_Server.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<UserAccount> UserAccounts => Set<UserAccount>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserAccount>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Auth0Sub).IsUnique();
            e.Property(u => u.Auth0Sub).HasMaxLength(128);
            e.Property(u => u.FirstName).HasMaxLength(100);
            e.Property(u => u.LastName).HasMaxLength(100);
            e.Property(u => u.Bio).HasMaxLength(500);
        });
    }
}
