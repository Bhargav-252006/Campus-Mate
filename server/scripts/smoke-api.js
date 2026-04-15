const axios = require('axios');

async function run() {
    try {
        const auth = await axios.post('http://localhost:3000/auth/session', {userId: 'debug-user'});
        console.log('AUTH', auth.status, Boolean(auth.data && auth.data.token));

        const headers = {
            Authorization: `Bearer ${auth.data.token}`,
            'x-user-id': 'debug-user'
        };

        const chat = await axios.post(
            'http://localhost:3000/chat',
            {userId: 'debug-user', message: 'hello from smoke'},
            {headers}
        );
        console.log('CHAT', chat.status, Object.keys(chat.data || {}));

        const history = await axios.get('http://localhost:3000/chat/history', {
            params: {userId: 'debug-user'},
            headers: {'x-user-id': 'debug-user'}
        });

        const historyArray = Array.isArray(history.data);
        console.log('HISTORY', history.status, historyArray, historyArray ? history.data.length : 'n/a');
    } catch (error) {
        console.error('API_FAIL', error.response?.status, error.response?.data || error.message);
        process.exit(1);
    }
}

run();
