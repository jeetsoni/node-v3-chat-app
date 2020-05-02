//core path library
const path = require('path')
//core http library
const http = require('http')
//install the express and add this library
const express = require('express')
//install socket.io and add this library
const socketio = require('socket.io')
//install bad-words library and add this library
const Filter = require('bad-words')
const {generateMessage,generateLocationMessage} = require('./utils/messages')
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/users')

//assigning the express server to app
const app = express()
//creating http server and give express server as argument
const server = http.createServer(app)  
//creating websocket and give http server as argument  
const io = socketio(server)

//assigning port to express server
const port = process.env.PORT || 3000
//assigning public directory
const publicDirectoryPath = path.join(__dirname, '../public')

//give access the public directory to express server
app.use(express.static(publicDirectoryPath))

//when web socket is created
io.on('connection',(socket) => {
    console.log('New WebSocket Connection')
    
    socket.on('join', ({username, room}, callback) => {
        const {error, user} =  addUser({id: socket.id,username,room})
        
        if(error) {
            return callback(error)
        }


        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message',generateMessage('Admin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room:user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message))
        {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username,message))
        callback()
    })
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coords.letitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user)
        {
            io.to(user.room).emit('message',generateMessage('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }


    })
    
})

//listen the server on port
server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})