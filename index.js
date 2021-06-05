#!/usr/bin/env node

//Routes File

'use strict'

/* MODULE IMPORTS */
const Koa = require('koa')
const Router = require('koa-router')
const views = require('koa-views')
const staticDir = require('koa-static')
const bodyParser = require('koa-bodyparser')
const Database = require('sqlite-async')
const koaBody = require('koa-body')({
	multipart: true,
	uploadDir: '.'
})
const session = require('koa-session')


//const jimp = require('jimp')

/* IMPORT CUSTOM MODULES */
const User = require('./modules/user')
const items = require('./modules/items')
const Customer = require('./modules/customer')
const sales = require('./modules/sales')
const app = new Koa()
const router = new Router()

/* CONFIGURING THE MIDDLEWARE */
app.keys = ['darkSecret']
app.use(staticDir('public'))
app.use(bodyParser())
app.use(session(app))

app.use(views(`${__dirname}/views`, {
	extension: 'hbs',
	options: {
		partials: {
			head: `${__dirname}/views/partials/head`,
			footer: `${__dirname}/views/partials/footer`,
			nav: `${__dirname}/views/partials/nav`

		}
	},
	map: {
		hbs: 'handlebars'
	}
}))


const defaultPort = 8080
const port = process.env.PORT || defaultPort
const dbName = 'website.db'

/**
 * The secure home page.
 *
 * @name Home Page
 * @route {GET} /
 * @authentication This route requires cookie-based authentication.
 */
router.get('/', async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/login?msg=you need to log in')
		const data = {}
		if (ctx.query.msg) data.msg = ctx.query.msg
		const item = await new items(dbName)
		const dd = await item.get_item()
		console.log(dd)

		await ctx.render('index', {
			title: 'Home',
			items: dd
		})
	} catch (err) {
		await ctx.render('index', {
			message: err.message,
		})
	}
})

// for table items
router.post('/', async ctx => {
	try {
		const body = ctx.request.body
		console.log(body)
		const item = await new items(dbName)
		await item.add_item(body.item_name, body.item_count, body.item_bcode)

		ctx.redirect('/?msg=Item added')
	} catch (err) {
		const item = await new items(dbName)
		const dd = await item.get_item()
		console.log(err.message)
		await ctx.render('index', {
			message: err.message,
			items: dd
		})
	}
})

router.post('/singleItem', async ctx => {
	const body = ctx.request.body
	const item = await new items(dbName)
	console.log(body.item_bcode)
	const sitem = await item.single_item(body.item_bcode)
	await ctx.render('singlepage', {sitem: sitem})
})


router.post('/delete', async ctx => {
	try {
		const body = ctx.request.body
		const item = await new items(dbName)
		console.log(body)
		await item.delete_item(body.item_id)

		ctx.redirect('/?msg=Item deleted')
	} catch (err) {
		console.log('test2')
		const item = await new items(dbName)
		const dd = await item.get_item()
		console.log(err.message)
		await ctx.render('index', {
			message: err.message,
			items: dd
		})
	}
})
router.get('/sold', async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/sold?msg=you just added a sale')
		const data = {}
		if (ctx.query.msg) data.msg = ctx.query.msg
		const sale = await new sales(dbName)
		const ps = await sale.get_sales()
		console.log(ps)
		await ctx.render('sold', {
			sales: ps
		})
	} catch (err) {
		await ctx.render('sold', {
			message: err.message,
		})
	}
})

router.post('/sold', async ctx => {
	try {
		const body = ctx.request.body
		console.log(body)
		const sale = await new sales(dbName)
		await sale.product_sales(body.quantity_sold, body.product_name, body.person_id)
		ctx.redirect('/sold?msg=New sale made')
	} catch (err) {
		const sale = await new sales(dbName)
		const ps = await sale.get_sales()
		console.log(err.message)
		await ctx.render('sold', {
			message: err.message,
			sales: ps
		})
	}
})

router.get('/sales', async ctx => {
	try {
		if (ctx.session.authorised !== true) return ctx.redirect('/sales?msg=you just added a sale')
		const data = {}
		if (ctx.query.msg) data.msg = ctx.query.msg
		const sale = await new sales(dbName)
		const ps = await sale.get_sales()
		console.log(ps)
		await ctx.render('sales', {
			sales: ps
		})
	} catch (err) {
		await ctx.render('sales', {
			message: err.message,
		})
	}
})


router.post('/sales', async ctx => {
	try {
		const body = ctx.request.body
		//console.log(body)
		const sale = await new sales(dbName)
		await sale.product_sales(body.quantity_sold, body.product_name, body.person_id)
		await ctx.redirect('/sales?msg=New sale made')
	} catch (err) {
		const sale = await new sales(dbName)
		const ps = await sale.get_sales()
		console.log(err.message)
		await ctx.render('sales', {
			message: err.message,
			sales: ps
		})
	}
})

//The route for the Form so we can add customers
router.get('/customers', async ctx => {
	if (ctx.session.authorised === false) return ctx.redirect('/login?msg=you need to log in')
	await ctx.render('customers')
})

router.post('/customers', koaBody, async ctx => {
	try {
		const body = ctx.request.body
		console.log(body)

		const customer = await new Customer(dbName)
		await customer.customer_register(body.firstname, body.lastname,body.email,body.address)
		ctx.redirect('/customerpage?msg=These are the current customers')
	} catch(err) {
		await ctx.render('customers' , {
			message: err.message
		})
	}
})

//The page we are redirected after we register a customer where we can search through customers
router.get('/customerpage', async ctx => {
	try {
		let querystring = ''
		console.log(ctx.query.q)
		let result = [0,0,0]
		if(ctx.query.q) {
			querystring = ctx.query.q
			const customer = await new Customer(dbName)
			result = await customer.getAllCustomers(Database, querystring, dbName)
		} else {
			querystring = ''
			const customer = await new Customer(dbName)
			result = await customer.getAllCustomers(Database, querystring, dbName)
		}
		await ctx.render('customerpage', {Customers: result[1], query: querystring, _count: result[0] })
	} catch(err) {
		console.log(err)
		ctx.body = err.message
	}
})

/**
 * The user registration page.
 *
 * @name Register Page
 * @route {GET} /register
 */
router.get('/register', async ctx => {
	if (ctx.session.authorised === true) return ctx.redirect('/')
	await ctx.render('register')
})

/**
 * The script to process new user registrations.
 *
 * @name Register Script
 * @route {POST} /register
 */
router.post('/register', koaBody, async ctx => {
	try {
		// extract the data from the request
		const body = ctx.request.body
		console.log(body)
		// call the functions in the module
		const user = await new User(dbName)
		await user.register(body.firstname, body.lastname,body.user, body.pass,body.email)
		// await user.uploadPicture(path, type)
		// redirect to the home page
		ctx.redirect('/login?msg=You can Login Now')
	} catch (err) {
		await ctx.render('register', {
			message: err.message
		})
	}
})

router.get('/login', async ctx => {
	if (ctx.session.authorised === true) return ctx.redirect('/')
	const data = {}
	if (ctx.query.msg) data.msg = ctx.query.msg
	if (ctx.query.user) data.user = ctx.query.user
	await ctx.render('login', {
		title: 'Login',
		msg: data.msg
	})
})

router.post('/login', async ctx => {
	try {
		const body = ctx.request.body
		console.log(body)

		const user = await new User(dbName)
		await user.login(body.user, body.pass)
		ctx.session.authorised = true
		ctx.session.username = body.user
		return ctx.redirect('/?msg=you are now logged in...')
	} catch (err) {
		await ctx.render('login', {
			message: err.message
		})
	}
})

router.get('/logout', async ctx => {
	ctx.session.authorised = null
	ctx.session.username = null
	ctx.redirect('/?msg=you are now logged out')
})


app.use(router.routes())
module.exports = app.listen(port, async() => console.log(`listening on port ${port}`))
