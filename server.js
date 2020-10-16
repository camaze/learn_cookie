var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
  console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
  process.exit(1)
}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true)
  var pathWithQuery = request.url
  var queryString = ''
  if (pathWithQuery.indexOf('?') >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf('?'))
  }
  var path = parsedUrl.pathname
  var query = parsedUrl.query
  var method = request.method

  /******** 从这里开始看，上面不要看 ************/

  console.log('方方说：含查询字符串的路径\n' + pathWithQuery)

  if (path === '/') {
    let string = fs.readFileSync('./index.html', 'utf-8')

    // console.log('cookies')
    // console.log(request.headers.cookie)
    let cookies = request.headers.cookie.split('; ')  // 注意是; 加一个空格
    let hash = {}
    for (let i = 0; i < cookies.length; i++){
      let parts = cookies[i].split('=')
      let key = parts[0]
      let value = parts[1]
      hash[key] = value
    }
    // console.log('hash')
    // console.log(hash)
    let email = hash.sign_in_email
    let users = fs.readFileSync('./db/users', 'utf-8')   // users没后缀，但是是json文件，读出来是字符串的json
    users = JSON.parse(users)    // [] json支持数组，字符串转为对象
    let foundUser
    for (let i = 0; i < users.length; i++){
      if (users[i].email === email) {
        foundUser = users[i]
        break
      }
    }

    if (foundUser) {
      string = string.replace('__password__', foundUser.password)
    } else {
      string = string.replace('__password__', '不知道')
    }

    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_up' && method ==='GET') {   // 在路由
    let string = fs.readFileSync('./sign_up.html', 'utf-8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/sign_up' && method === 'POST') {
    readBody(request).then((body) => {
      let strings = body.split('&')   // ['email=xxx', 'password=xxx', 'password_confirmation=xxx']
      let hash = {}
      strings.forEach((string) => {
        // string = 'email=xxx'
        let parts = string.split('=')    // ['email', 'xxx']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value)    // hash['email'] = 'xxx'
      })
      // let email = hash['email']
      // let password = hash['password']
      // let password_confirmation = hash['password_confirmation']
      let { email, password, password_confirmation } = hash
      console.log('here1', email)
      if (email.indexOf('@') === -1) {
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json; charset=utf-8')  // 写这个有response.responseJSON
        response.write(`{
          "errors":{
            "email": "invalid"
          }
        }`)
      } else if (password !== password_confirmation) {
        response.statusCode = 400
        response.write('password not match')
      } else {
        var users = fs.readFileSync('./db/users', 'utf-8')   // users没后缀，但是是json文件，读出来是字符串的json
        try {
          users = JSON.parse(users)    // [] json支持数组，字符串转为对象
        } catch (exception) {          // 如果json不能parse（读的格式不对）
          users = []
        }
        let inUse = false
        for (let i = 0; i < users.length; i++){
          let user = users[i]
          if (user.email === email) {
            inUse = true      // 邮箱被占用了
            break; 
          }
        }
        if (inUse) {
          response.statusCode = 400
          response.write('email in use')          
        } else {
          users.push({ email: email, password: password })
          var usersString = JSON.stringify(users)   // 转换为json格式字符串
          fs.writeFileSync('./db/users', usersString)
          response.statusCode = 200        
        }

      }
      response.end()
    })

    // let body = []  // 请求体
    // request.on('data', (chunk) => {
    //   body.push(chunk)
    // }).on('end', () => {
    //   body = Buffer.concat(body).toString();
    //   console.log(body)
    //   response.statusCode = 200
    //   response.end()
    // })

  } else if (path === '/sign_in' && method == 'GET') {
    let string = fs.readFileSync('./sign_in.html', 'utf-8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()    
  } else if (path === '/sign_in' && method == 'POST') {
    readBody(request).then((body) => {
      let strings = body.split('&')   // ['email=xxx', 'password=xxx', 'password_confirmation=xxx']
      let hash = {}
      strings.forEach((string) => {
        // string = 'email=xxx'
        let parts = string.split('=')    // ['email', 'xxx']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value)    // hash['email'] = 'xxx'
      })
      // let email = hash['email']
      // let password = hash['password']
      // let password_confirmation = hash['password_confirmation']
      let { email, password } = hash
      console.log('here1', email)
      console.log('here2', password)
      var users = fs.readFileSync('./db/users', 'utf-8')   // users没后缀，但是是json文件，读出来是字符串的json
      try {
        users = JSON.parse(users)    // [] json支持数组，字符串转为对象
      } catch (exception) {          // 如果json不能parse（读的格式不对）
        users = []
      }
      let found
      for (let i = 0; i < users.length; i++){
        if (users[i].email === email && users[i].password === password) {
          found = true
        }
      }
      if (found) {
        // Set-Cookie: <cookie-name>=<cookie-value>
        response.setHeader('Set-Cookie', `sign_in_email=${email}; HttpOnly`)   // 设置cookie 只要我给你设置了cookie，以后每次请求都带上他
        response.statusCode = 200
      } else {
        response.statusCode = 401
      }
      response.end()
    })
  } else if (path === '/main.js') {
    let string = fs.readFileSync('./main.js', 'utf-8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/javascript;charset=utf-8')
    response.write(string)
    response.end()
  } else if (path === '/xxx') {
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/JSON;charset=utf-8')
    response.setHeader('Access-Control-Allow-Origin', 'http://frank.com:8001')
    response.write(`
    {
      "note":{
        "to":"蚊蚊",
        "from":"黏黏",
        "heading":"打招呼",
        "content":"hello"
      }
    }
`)
    response.end()
  } else {
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write('呜呜呜')
    response.end()
  }

  /******** 代码结束，下面不要看 ************/
})

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = []
    request.on('data', (chunk) => {
      body.push(chunk)
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      resolve.call(undefined, body)
    })
  })
}


server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)