from django.urls import path, include
from billing.views import MarpSloDashboardView

urlpatterns = [
    path('slo-dashboard/', MarpSloDashboardView.as_view(), name='marp-slo-dashboard'),
    path('proximity/', include('proximity.urls')),
    path('health/', include('healthcheck.urls')),
]