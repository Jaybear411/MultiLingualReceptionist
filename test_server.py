from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({
        'status': 'success',
        'message': 'Server is running!'
    })

@app.route('/api/test')
def test():
    return jsonify({
        'status': 'success',
        'message': 'API is working!'
    })

if __name__ == '__main__':
    print("Starting Flask server...")
    print("Server will be available at http://localhost:5001")
    app.run(debug=True, host='localhost', port=5001)
