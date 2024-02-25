const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const {format} = require('date-fns')
const isValid = require('date-fns/isValid')

const dbPath = path.join(__dirname, 'todoApplication.db')
const app = express()
app.use(express.json())

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started...')
    })
  } catch (e) {
    console.log(`Error DB: ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

// Validation
const validPriority = (request, response, next) => {
  const reqMethod = request.method
  let priority

  if (reqMethod === 'GET') {
    priority = request.query.priority
  } else if (reqMethod === 'POST' || reqMethod === 'PUT') {
    priority = request.body.priority
  }

  if (
    priority === 'HIGH' ||
    priority === 'MEDIUM' ||
    priority === 'LOW' ||
    priority === undefined
  ) {
    next()
  } else {
    response.status(400)
    response.send('Invalid Todo Priority')
  }
}
const validStatus = (request, response, next) => {
  const reqMethod = request.method
  let status

  if (reqMethod === 'GET') {
    status = request.query.status
  } else if (reqMethod === 'POST' || reqMethod === 'PUT') {
    status = request.body.status
  }

  if (
    status === 'TO DO' ||
    status === 'IN PROGRESS' ||
    status === 'DONE' ||
    status === undefined
  ) {
    next()
  } else {
    response.status(400)
    response.send('Invalid Todo Status')
  }
}

const validCategory = (request, response, next) => {
  const reqMethod = request.method
  let category

  if (reqMethod === 'GET') {
    category = request.query.category
  } else if (reqMethod === 'POST' || reqMethod === 'PUT') {
    category = request.body.category
  }

  if (
    category === 'WORK' ||
    category === 'HOME' ||
    category === 'LEARNING' ||
    category === undefined
  ) {
    next()
  } else {
    response.status(400)
    response.send('Invalid Todo Category')
  }
}

const validDueDate = (request, response, next) => {
  const reqMethod = request.method
  let date

  if (reqMethod === 'GET') {
    date = request.query.date
  } else if (reqMethod === 'POST' || reqMethod === 'PUT') {
    date = request.body.dueDate
  }
  if (isValid(new Date(date)) || date === undefined) {
    if (date !== undefined) {
      const getreqDate = format(new Date(date), 'yyyy-MM-dd')
      request.dateVal = getreqDate
    }
    next()
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
}

// Validate property
function isValuePresent(property) {
  return property !== undefined
}

function convertTodoKeys(eachTodo) {
  return {
    id: eachTodo.id,
    todo: eachTodo.todo,
    priority: eachTodo.priority,
    status: eachTodo.status,
    category: eachTodo.category,
    dueDate: eachTodo.due_date,
  }
}

// API 1

app.get(
  '/todos/',
  validPriority,
  validStatus,
  validCategory,
  async (request, response) => {
    const {status, priority, search_q = '', category} = request.query

    switch (true) {
      case isValuePresent(priority) && isValuePresent(status):
        getTodosQuery = `SELECT * FROM todo WHERE priority = '${priority}' and status = '${status}' and todo LIKE '%${search_q}%'`
        break
      case isValuePresent(priority) && isValuePresent(category):
        getTodosQuery = `SELECT * FROM todo WHERE priority = '${priority}' and category = '${category}' and todo LIKE '%${search_q}%'`
        break
      case isValuePresent(status) && isValuePresent(category):
        getTodosQuery = `SELECT * FROM todo WHERE status = '${status}' and category = '${category}' and todo LIKE '%${search_q}%'`
        break
      case isValuePresent(priority):
        getTodosQuery = `SELECT * FROM todo  WHERE priority = '${priority}' and todo LIKE '%${search_q}%'`
        break
      case isValuePresent(status):
        getTodosQuery = `SELECT * FROM todo WHERE status = '${status}' and todo LIKE '%${search_q}%'`
        break
      case isValuePresent(category):
        getTodosQuery = `SELECT * FROM todo  WHERE category = '${category}' and todo LIKE '%${search_q}%'`
        break
      default:
        getTodosQuery = `SELECT * FROM todo  WHERE todo LIKE '%${search_q}%'`
        break
    }

    const getTodos = await db.all(getTodosQuery)
    response.send(getTodos.map(eachTodo => convertTodoKeys(eachTodo)))
  },
)

// API 2

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId}`
  const getTodo = await db.get(getTodoQuery)
  response.send(convertTodoKeys(getTodo))
})

// API 3

app.get('/agenda/', validDueDate, async (request, response) => {
  const {dateVal} = request

  const getSpecifDateQuery = `SELECT * FROM todo WHERE due_date = '${dateVal}'`
  const getSpecifDate = await db.all(getSpecifDateQuery)

  response.send(getSpecifDate.map(eachTodo => convertTodoKeys(eachTodo)))
})

// API 4

app.post(
  '/todos/',
  validPriority,
  validStatus,
  validCategory,
  validDueDate,
  async (request, response) => {
    const {dateVal} = request
    const {id, todo, priority, status, category, dueDate} = request.body
    const addTodoQuery = `INSERT INTO 
      todo(id, todo, priority , status, category, due_date)
    VALUES
      (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dateVal}');`
    await db.run(addTodoQuery)
    response.send('Todo Successfully Added')
  },
)

// API 5

app.put(
  '/todos/:todoId/',
  validPriority,
  validStatus,
  validCategory,
  validDueDate,
  async (request, response) => {
    const {todoId} = request.params
    const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId}`
    const getTodoRes = await db.get(getTodoQuery)
    let res
    if (request.body.status !== undefined) {
      res = 'Status'
    } else if (request.body.priority !== undefined) {
      res = 'Priority'
    } else if (request.body.todo !== undefined) {
      res = 'Todo'
    } else if (request.body.category !== undefined) {
      res = 'Category'
    } else if (request.body.dueDate !== undefined) {
      res = 'Due Date'
    }
    const {
      todo = getTodoRes.todo,
      priority = getTodoRes.priority,
      status = getTodoRes.status,
      category = getTodoRes.category,
      dueDate = getTodoRes.due_date,
    } = request.body
    const updateTodoQuery = `
    UPDATE 
      todo
    SET
      todo = '${todo}',
      priority = '${priority}',
      status = '${status}',
      category = '${category}',
      due_date = '${dueDate}'
    WHERE 
     id = ${todoId}`

    await db.run(updateTodoQuery)
    response.send(`${res} Updated`)
  },
)

// API 6

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId}`
  await db.run(deleteTodoQuery)

  response.send('Todo Deleted')
})

module.exports = app
