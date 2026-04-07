from django.contrib import admin
from django.urls import path

# 🔹 Add branding here
admin.site.site_header = "Pulsco Global Ltd Administration"
admin.site.site_title = "Pulsco Global Ltd Admin Portal"
admin.site.index_title = "Welcome to Pulsco Global Ltd Admin"

urlpatterns = [
    path('admin/', admin.site.urls),
]
