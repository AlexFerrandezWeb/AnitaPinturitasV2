from flask import Flask, request, jsonify
from flask_cors import CORS
import stripe
import os

app = Flask(__name__)
CORS(app)

# Configuración de Stripe
stripe.api_key = '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'

# Configuración
CURRENCY = 'eur'
SUCCESS_URL = 'https://anitapinturitas.es/success'
CANCEL_URL = 'https://anitapinturitas.es/cancel'
ALLOWED_COUNTRIES = ['ES', 'PT', 'FR', 'IT', 'DE', 'GB']
IMAGEN_POR_DEFECTO = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop&crop=center"

SHIPPING_OPTIONS = [
    {
        'shipping_rate_data': {
            'type': 'fixed_amount',
            'fixed_amount': {
                'amount': 500,  # 5€
                'currency': CURRENCY,
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
]

@app.route('/test', methods=['GET'])
def test():
    return jsonify({
        'status': 'ok', 
        'message': 'NUEVO SERVidor funcionando correctamente - VERSION 2025',
        'version': 'payment-server-2025',
        'timestamp': '2025-01-27-15:45',
        'server': 'payment_server.py'
    })

@app.route('/debug', methods=['GET'])
def debug():
    return jsonify({
        'status': 'debug',
        'message': 'Debug endpoint funcionando',
        'version': 'payment-server-2025',
        'timestamp': '2025-01-27-15:45',
        'routes': ['/test', '/debug', '/pagar-ahora-2025']
    })

@app.route('/pagar-ahora-2025', methods=['POST'])
def pagar_ahora_2025():
    try:
        print("🚀 NUEVO SERVIDOR /pagar-ahora-2025 - Sin automatic_payment_methods")
        data = request.get_json()
        carrito = data.get('carrito', [])

        subtotal = sum(float(producto['precio']) * int(producto['cantidad']) for producto in carrito)
        envio_gratuito = subtotal >= 62

        line_items = []
        for producto in carrito:
            product_data = {
                'name': producto['nombre'],
                'images': []
            }

            imagen_url = producto.get('imagen')
            if imagen_url:
                if imagen_url.startswith('/'):
                    imagen_url = f"https://anitapinturitas.es{imagen_url}"
                elif not imagen_url.startswith('http'):
                    imagen_url = f"https://anitapinturitas.es/{imagen_url.lstrip('/')}"
                product_data['images'].append(imagen_url)
            else:
                product_data['images'].append(IMAGEN_POR_DEFECTO)

            line_items.append({
                'price_data': {
                    'currency': CURRENCY,
                    'product_data': product_data,
                    'unit_amount': int(float(producto['precio']) * 100),
                },
                'quantity': int(producto['cantidad']),
            })

        shipping_options = [] if envio_gratuito else SHIPPING_OPTIONS

        session = stripe.checkout.Session.create(
            line_items=line_items,
            mode='payment',
            success_url=SUCCESS_URL,
            cancel_url=CANCEL_URL,
            shipping_address_collection={
                'allowed_countries': ALLOWED_COUNTRIES,
            },
            phone_number_collection={
                'enabled': True,
            },
            shipping_options=shipping_options,
            locale='es',
            billing_address_collection='required',
            payment_method_types=['card', 'paypal'],  # Versión corregida sin automatic_payment_methods
            metadata={
                'source': 'anita_pinturitas_web'
            }
        )
        
        print(f"🚀 NUEVO SERVIDOR /pagar-ahora-2025 - Sesión creada exitosamente: {session.id}")
        print("✅ Sin automatic_payment_methods - Solo payment_method_types=['card', 'paypal']")
        return jsonify({'id': session.id})
        
    except Exception as e:
        print(f"Error al crear sesión: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/cancel', methods=['GET'])
def cancel():
    return jsonify({'message': 'Pago cancelado'})

@app.route('/success', methods=['GET'])
def success():
    return jsonify({'message': 'Pago exitoso'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000))) 