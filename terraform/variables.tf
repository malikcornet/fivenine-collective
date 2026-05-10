variable "railway_token" {
  description = "Railway API token — Account Settings → API Tokens → Create token"
  type        = string
  sensitive   = true
}

variable "subdomain_prefix" {
  description = "Globally-unique subdomain prefix. 'fivenine' produces fivenine.up.railway.app (frontend) and fivenine-api.up.railway.app (server). Change if taken."
  type        = string
  default     = "fivenine"
}
