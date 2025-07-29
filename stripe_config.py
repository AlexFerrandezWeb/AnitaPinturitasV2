# Configuración de Stripe para Anita Pinturitas

# Configuración de países permitidos para envío
ALLOWED_COUNTRIES = ['ES']  # Solo España por defecto
# Puedes añadir más países: ['ES', 'PT', 'FR', 'DE', 'IT']

# Configuración de recolección de datos del cliente
# - Email: Se solicita automáticamente
# - Teléfono: Se solicita automáticamente (configurado en stripe_server.py)
# - Dirección de envío: Se solicita automáticamente

# Funcionalidades de productos:
# - Imágenes: Se muestran automáticamente en la página de Stripe
#   * Las rutas relativas se convierten automáticamente en URLs absolutas
#   * Base URL: https://anitapinturitas.es
#   * Formato: https://anitapinturitas.es/assets/producto1.jpg
# - Nombres: Se muestran con el nombre del producto
# - Precios: Se calculan automáticamente

# Lógica de envío:
# - Pedidos de 62€ o más: ENVÍO GRATUITO
# - Pedidos menores a 62€: 6.95€ de gastos de envío

# Configuración de opciones de envío (solo se aplica para pedidos < 62€)
SHIPPING_OPTIONS = [
    {
        'shipping_rate_data': {
            'type': 'fixed_amount',
            'fixed_amount': {
                'amount': 695,  # 6.95€ en centavos
                'currency': 'eur',
            },
            'display_name': 'Envío estándar',
            'delivery_estimate': {
                'minimum': {
                    'unit': 'business_day',
                    'value': 3,
                },
                'maximum': {
                    'unit': 'business_day',
                    'value': 5,
                },
            },
        },
    },
    # Puedes añadir más opciones de envío aquí:
    # {
    #     'shipping_rate_data': {
    #         'type': 'fixed_amount',
    #         'fixed_amount': {
    #             'amount': 999,  # 9.99€ en centavos
    #             'currency': 'eur',
    #         },
    #         'display_name': 'Envío express',
    #         'delivery_estimate': {
    #             'minimum': {
    #                 'unit': 'business_day',
    #                 'value': 1,
    #             },
    #             'maximum': {
    #                 'unit': 'business_day',
    #                 'value': 2,
    #             },
    #         },
    #     },
    # },
]

# URLs de éxito y cancelación
SUCCESS_URL = 'https://anitapinturitas.es/success'
CANCEL_URL = 'https://anitapinturitas.es/carrito.html'

# Configuración de moneda
CURRENCY = 'eur' 