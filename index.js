const hapi = require('hapi');
const wilddog = require('wilddog');
const fs = require('fs');
const path = require('path');
const h2o2 = require('h2o2');
const inert = require('inert');

// wilddog 数据
let config = {
    syncURL: 'https://wslx.wilddogio.com'
}

wilddog.initializeApp(config);

let sync = wilddog.sync();
let ref = sync.ref();

// 清空原来的数据
// ref.child('tree_folder').remove();

// 查询，如无数据则初始化数据
ref.on('value', (snapshot) => {
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
ref.off();

let files = sync.ref('tree_folder/files');
// console.log(files.val());

let getChildFolder = (
    refs => (
        id => (
            refs[id] || (refs[id] = files.child(id))
        )
    )    
)({});

// hapi server
let server = new hapi.Server();

function startServer() {
    
    server.start((err, info) => {
        if (err) throw err;
        console.log(`Hapi Server start at ${port}`)
    })
}
server.register({
    register: h2o2
}, function (err) {

    if (err) {
        console.log('Failed to load h2o2');
    }

    startServer();
});
const port = 3333;
server.connection({
    host: '0.0.0.0',
    port,
    routes: {
        // 允许跨域访问
        cors: true
    }
});

// 没用了
// let getOnValue = reply => 
//     snapshot => {
//         if (snapshot) {
//             // console.log(Date.now() - now);
//             return reply(snapshot.val());
//         }
//         return reply().code(404);
//     };
// 静态托管目录下所有资源(当没有对应的 route 时, 走这里)
server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
        directory: {
            path: '.',
            redirectToSlash: true,
            index: true
        }
    }
});
server.route([{
    method: 'GET',
    path: '/',
    handler: (req, reply) => reply('hello, I\'m hapi')
}, {
    method: 'get',
    path: '/files',
    handler: (req, reply) => {
        let {query} = req;
        let {pid} = query;
        let rep = val => reply(val);
        if (pid !== undefined) {
            files.orderByChild('pid').on('value', snapshot => {
                let len = snapshot.numChildren();
                let res = [];
                    snapshot.forEach( (ss) => {
                        let val = ss.val();
                        console.log(pid, val.pid, pid == val.pid);
                        if (val.pid == pid) {
                            // rep(val);
                            // return true;
                            res.push(val);
                        }
                        if (len - 1) {
                            len -= 1;
                        } else {
                            rep(res);
                        }
                    })
                    // return reply(snapshot.val());
                // return reply().code(404);
            })
        }
        else {
            // 对不带参数的 files 请求，直接返回列表
            files.on('value', snapshot => {
                let len = snapshot.numChildren();
                let res = [];
                    snapshot.forEach( (ss) => {
                        res.push(ss.val());
                    })
                return reply(res);
            })
        }
        // return reply({params: req.params, query: req.query, payload:　req.payload});
    }
}, {
    method: 'post',
    path: '/files',
    handler: (req, reply) => {
        // 随便生成个ID
        let id = (Math.random() + '').substr(2);
        let {payload} = req;
        console.log(payload);
        if (!payload) {
            return reply().code(500);
        }
        let folder = Object.assign(payload, {
            id,
            lastModified: Date.now()
        })
        files.child(id).set(folder);
        let {pid} = payload;
        if (pid != 0) {
            console.log(pid);
            files.child(pid).once('value', snapshot => {
                let val = snapshot.val();
                let num = val.folderNumber || 0;
                console.log(val, num);
                files.child(pid).update({folderNumber: num - 0 + 1});
            })
            
        }
        
        // files.set(id, folder);
        return reply(folder);
    }
}, {
    method: 'get',
    path: '/files/{id}',
    handler: (req, reply) => {
        let {id} = req.params;
        // let now = Date.now();
        // 将事件监听函数引用到 reply上，以避免重复监听
        // 后来发现 reply 每次请求都是新的，所以根本不存在重复监听的问题
        // console.log(reply.onValue);
        // if (!reply.onValue) {
        //     reply.onValue = getOnValue(reply);
        // }        
        // getChildFolder(id).on('value')
        files.child(id).on('value', snapshot => {
            if (snapshot.exists()) {
                // console.log(Date.now() - now);
                return reply(snapshot.val());
            }
            return reply().code(404);
        })
        // files.child(id).on('value', snapshot => {
        //     if (snapshot) {
        //         console.log(Date.now() - now);
        //         return reply(snapshot.val());
        //     }
        //     return reply().code(404);
        // })
    }
}])

// 测试代理
server.route({
    method: 'get',
    path: '/api/{trueUrl*}',
    // handler: {
    //     proxy: {
    //         uri: 'http://www.google.com.ph/?gfe_rd=cr&ei=2aeWWez_OenN8geVioqwAw'
    //     }
    // }
    handler: function (req, reply) {
        console.log('http://192.168.6.193:8080/(S(4zio3xoun3ajnlstl42n1o4i))/' + req.params.trueUrl)
        reply.proxy({uri: 'http://192.168.6.193:8080/(S(4zio3xoun3ajnlstl42n1o4i))/' + req.params.trueUrl});
    }
})

// 纯测试
server.route({
    method: 'get',
    path: '/apid',
    handler: function (req, reply) {
        reply('apidddddddddddd')
    }
})
