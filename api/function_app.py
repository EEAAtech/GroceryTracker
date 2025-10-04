import azure.functions as func
from app import app # Import the Flask app object from your app.py file

# This boilerplate is the standard way to host a WSGI app (like Flask) in Azure Functions v2
# It creates a single, anonymous-access HTTP-triggered function.
function_app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@function_app.route(route="{*route}") # This catch-all route forwards all paths
def main(req: func.HttpRequest) -> func.HttpResponse:
    """
    This function is a wrapper that passes all incoming HTTP requests
    to the underlying Flask application for processing.
    """
    return func.WsgiMiddleware(app.wsgi_app).handle(req)