import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import stripe

app = Flask(__name__)
CORS(app)

# Configuración directa sin archivo externo para simplificar
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Configuración simplificada
ALLOWED_COUNTRIES = ['ES']
CURRENCY = 'eur'
SUCCESS_URL = 'https://anita-pinturitas-server.onrender.com/success'
CANCEL_URL = 'https://anita-pinturitas-server.onrender.com/cancel'

# Imagen por defecto para productos sin imagen
IMAGEN_POR_DEFECTO = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop&crop=center"

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
]

@app.route('/crear-sesion', methods=['POST'])
def crear_sesion():
    try:
        print("Recibida petición para crear sesión")
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
            payment_method_collection='always',
            automatic_payment_methods={'enabled': True},  # 🔥 AQUÍ está la clave
            metadata={
                'source': 'anita_pinturitas_web'
            }
        )
        
        print(f"Sesión creada exitosamente: {session.id}")
        return jsonify({'id': session.id})
        
    except Exception as e:
        print(f"Error al crear sesión: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'status': 'ok', 'message': 'Servidor funcionando correctamente'})

@app.route('/test-payment-methods', methods=['GET'])
def test_payment_methods():
    """Prueba para verificar qué métodos de pago están disponibles"""
    try:
        # Crear una sesión de prueba para verificar métodos de pago
        test_session = stripe.checkout.Session.create(
            payment_method_types=['card', 'paypal'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': 'Test Product',
                    },
                    'unit_amount': 1000,  # 10€
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='https://example.com/success',
            cancel_url='https://example.com/cancel',
        )
        
        return jsonify({
            'status': 'ok',
            'session_id': test_session.id,
            'payment_methods': test_session.payment_method_types,
            'message': 'Sesión de prueba creada correctamente'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'message': 'Error al crear sesión de prueba'
        }), 400

@app.route('/crear-sesion-simple', methods=['POST'])
def crear_sesion_simple():
    """Crea una sesión solo con tarjetas para comparar"""
    try:
        print("Recibida petición para crear sesión simple (solo tarjetas)")
        data = request.get_json()
        carrito = data.get('carrito', [])
        
        line_items = []
        for producto in carrito:
            product_data = {
                'name': producto['nombre'],
            }
            
            if 'imagen' in producto and producto['imagen']:
                imagen_url = producto['imagen']
                if imagen_url.startswith('/'):
                    imagen_url = f"https://anitapinturitas.es{imagen_url}"
                elif not imagen_url.startswith('http'):
                    imagen_url = f"https://anitapinturitas.es/{imagen_url.lstrip('/')}"
                
                product_data['images'] = [imagen_url]
            
            line_items.append({
                'price_data': {
                    'currency': CURRENCY,
                    'product_data': product_data,
                    'unit_amount': int(float(producto['precio']) * 100),
                },
                'quantity': int(producto['cantidad']),
            })

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],  # Solo tarjetas
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
            locale='es'
        )
        
        print(f"Sesión simple creada exitosamente: {session.id}")
        return jsonify({'id': session.id})
        
    except Exception as e:
        print(f"Error al crear sesión simple: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/cancel', methods=['GET'])
def cancel():
    """Redirige a la página del carrito en el sitio principal"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redirigiendo al carrito...</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .container {
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            .spinner {
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
        <meta http-equiv="refresh" content="2; url=https://anitapinturitas.es/carrito.html">
    </head>
    <body>
        <div class="container">
            <div class="spinner"></div>
            <h2>Redirigiendo al carrito...</h2>
            <p>Si no eres redirigido automáticamente, <a href="https://anitapinturitas.es/carrito.html" style="color: #fff; text-decoration: underline;">haz clic aquí</a></p>
        </div>
        <script>
            setTimeout(function() {
                window.location.href = 'https://anitapinturitas.es/carrito.html';
            }, 2000);
        </script>
    </body>
    </html>
    """

@app.route('/success', methods=['GET'])
def success():
    """Redirige a la página de éxito en el sitio principal"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pago exitoso - Redirigiendo...</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
            }
            .container {
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            .checkmark {
                font-size: 60px;
                margin-bottom: 20px;
            }
        </style>
        <meta http-equiv="refresh" content="2; url=https://anitapinturitas.es/success">
    </head>
    <body>
        <div class="container">
            <div class="checkmark">✅</div>
            <h2>¡Pago completado con éxito!</h2>
            <p>Redirigiendo a la página de confirmación...</p>
            <p>Si no eres redirigido automáticamente, <a href="https://anitapinturitas.es/success" style="color: #fff; text-decoration: underline;">haz clic aquí</a></p>
        </div>
        <script>
            setTimeout(function() {
                window.location.href = 'https://anitapinturitas.es/success';
            }, 2000);
        </script>
    </body>
    </html>
    """

if __name__ == '__main__':
    print("Iniciando servidor de Stripe...")
    print(f"Clave de Stripe configurada: {'Sí' if stripe.api_key else 'No'}")
    app.run(port=4242, debug=True) 