using Microsoft.EntityFrameworkCore;

namespace FiveNine_Collective_Site_Server.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Widget> Widgets => Set<Widget>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Profile>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => p.Auth0Sub).IsUnique();
            e.Property(p => p.Auth0Sub).HasMaxLength(128);
            e.Property(p => p.Name).HasMaxLength(120).IsRequired();
            e.Property(p => p.Role).HasMaxLength(120).IsRequired();
            e.Property(p => p.Bio).HasMaxLength(280).IsRequired();
            e.HasMany(p => p.Widgets)
                .WithOne(w => w.Profile)
                .HasForeignKey(w => w.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Widget>(e =>
        {
            e.HasKey(w => w.Id);
            e.Property(w => w.Type).HasMaxLength(32);
            e.Property(w => w.Data).HasColumnType("jsonb");
            e.HasIndex(w => w.ProfileId);
        });
    }
}
