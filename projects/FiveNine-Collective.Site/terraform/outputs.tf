output "frontend_url" {
  description = "Public URL of the React frontend"
  value       = "https://${railway_service_domain.frontend.domain}"
}

output "server_url" {
  description = "Public URL of the .NET API"
  value       = "https://${railway_service_domain.server.domain}"
}
