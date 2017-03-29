const hapi = require('hapi');
const wilddog = require('wilddog');
const fs = require('fs');
const path = require('path');


// wilddog 数据
let config = {
    syncURL: 'https://wslx.wilddogio.com'
}

wilddog.initializeApp(config);

let ref = wilddog.sync().ref();

// 清空原来的数据
// ref.child('tree_folder').remove();

// 查询，如无数据则初始化数据
ref.once('value', (snapshot) => {
    if (!snapshot.hasChild('tree_folder')) {
        fs.readFile('./data/db.json', 'utf8', function (err, data) {
            if (err) throw err;
            ref.set(null);
            ref.set({
                tree_folder: JSON.parse(data)
            })

        });
    }
})

let files = wilddog.sync().ref('tree_folder/files');
// console.log(files.val());
files.orderByChild('id').once('value', (snapshot) => {
    // console.log(snapshot.val())
});

// hapi server
let server = new hapi.Server();
const port = 3333;
server.connection({
    host: '0.0.0.0',
    port
});

server.route([{
    method: 'GET',
    path: '/',
    handler: (req, reply) => reply('hello, I\'m hapi')
}, {
    method: 'get',
    path: '/files',
    handler: (req, reply) => {
        return reply({params: req.params, query: req.query, payload:　req.payload});
    }
}, {
    method: 'post',
    path: '/files',
    handler: (req, reply) => {
        // 随便生成个ID
        let id = (Math.random() + '').substr(2);
        let payload = req.payload;
        if (!payload) {
            return reply().code(500);
        }
        console.log(payload);
        let folder = Object.assign(payload, {
            id,
            lastModified: Date.now()
        })
        files.set(id, folder);
        return reply(folder);
    }
}, {
    method: 'get',
    path: '/files/{id}',
    handler: (req, reply) => {
        let id = req.params.id;
        let now = Date.now();
        files.child(id).once('value').then(snapshot => {
            if (snapshot) {
                console.log(Date.now() - now);
                return reply(snapshot.val());
            }
            return reply().code(404);
        })
        
    }
}])


server.start((err, info) => {
    if (err) throw err;
    console.log(`Hapi Server start at ${port}`)
})