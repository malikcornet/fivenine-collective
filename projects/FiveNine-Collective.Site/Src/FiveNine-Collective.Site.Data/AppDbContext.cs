using Microsoft.EntityFrameworkCore;

namespace FiveNine_Collective_Site.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<CanvasItem> CanvasItems => Set<CanvasItem>();
    public DbSet<ProfileItem> Profiles => Set<ProfileItem>();
    public DbSet<ProjectItem> Projects => Set<ProjectItem>();
    public DbSet<Widget> Widgets => Set<Widget>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CanvasItem>(e =>
        {
            e.ToTable("CanvasItems");
            e.HasKey(c => c.Id);
            e.Property(c => c.Auth0Sub).HasMaxLength(128).IsRequired();
            e.Property(c => c.Name).HasMaxLength(120).IsRequired();
            // EF TPH: single table, discriminator column "Kind".
            e.HasDiscriminator<string>("Kind")
                .HasValue<ProfileItem>("profile")
                .HasValue<ProjectItem>("project");
            e.HasMany(c => c.Widgets)
                .WithOne(w => w.CanvasItem)
                .HasForeignKey(w => w.CanvasItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileItem>(e =>
        {
            // Profiles are unique per Auth0 sub. Projects share the column
            // without uniqueness, so we filter the index to the profile rows.
            e.HasIndex(p => p.Auth0Sub)
                .IsUnique()
                .HasFilter("\"Kind\" = 'profile'")
                .HasDatabaseName("IX_CanvasItems_ProfileAuth0Sub");
            e.Property(p => p.Role).HasMaxLength(120).IsRequired();
            e.Property(p => p.Bio).HasMaxLength(280).IsRequired();
        });

        modelBuilder.Entity<ProjectItem>(e =>
        {
            e.Property(p => p.Description).HasMaxLength(560).IsRequired();
            e.Property(p => p.CollaboratorSubs)
                .HasColumnType("text[]")
                .IsRequired();
        });

        modelBuilder.Entity<Widget>(e =>
        {
            e.HasKey(w => w.Id);
            e.Property(w => w.Type).HasMaxLength(32);
            e.Property(w => w.Data).HasColumnType("jsonb");
            e.HasIndex(w => w.CanvasItemId);
        });
    }
}
