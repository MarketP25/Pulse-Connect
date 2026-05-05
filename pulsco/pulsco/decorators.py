from django.http import JsonResponse
from functools import wraps

def pc365_dual_control(view_func):
    """
    Security decorator for PC365 Dual-Control compliance.
    Requires a valid 'X-PC365-Signature' header representing secondary authorization
    for sensitive planetary operations.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        pc365_sig = request.headers.get('X-PC365-Signature')

        if not pc365_sig:
            return JsonResponse({'status': 'error', 'message': 'PC365 Dual-Control Signature Required'}, status=403)

        return view_func(request, *args, **kwargs)
    return _wrapped_view