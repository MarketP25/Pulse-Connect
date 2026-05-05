from django.urls import path
from billing.views import MarpSloDashboardView

urlpatterns = [
    path('slo-dashboard/', MarpSloDashboardView.as_view(), name='marp-slo-dashboard'),
]