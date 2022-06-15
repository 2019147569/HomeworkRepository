const express = require('express');
const app = express();

const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

const fs = require('fs');

// config
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB connection
async function getDBConnection() {
    const db = await sqlite.open({
        filename: __dirname + '/product.db',
        driver: sqlite3.Database
    });
    return db;
}

// view functions
app.get('/', async (req, res) => {
    let category = req.query.category;
    let searchTerm = req.query.search;
    let searchQuery = `select * from product `;
    let isWhere = false;

    if (!category) category = 'All';
    if (category !== 'All') {
        searchQuery += `where product_category = "${category}" `;
        isWhere = true;
    }
    if (searchTerm) {
        if (isWhere) searchQuery += `and product_title like "%${searchTerm}%"`;
        else searchQuery += `where product_title like "%${searchTerm}%"`;
    }

    let db = await getDBConnection();
    let rows = await db.all(searchQuery);
    console.log(`[SQL] ${searchQuery}`);
    await db.close();

    res.render('index', {
        items: rows,
        category: category,
        searchTerm: searchTerm
    });
});

app.get('/product/:product_id', async (req, res) => {
    let productId = req.params.product_id;
    let searchQuery = `select * from product where product_id = ${productId}`;

    // product info
    let db = await getDBConnection();
    let product = await db.all(searchQuery);
    console.log(`[SQL] ${searchQuery}`);
    await db.close();

    // comment
    let data = fs.readFileSync(__dirname + '/comment.json', 'utf8');
    let commentData = JSON.parse(data);
    let commentList = [];
    if (commentData[productId - 1]) {
        for (const comment of commentData[productId - 1].comments) {
            commentList.push(comment.body);
        }
    }

    res.render('product', {
        productId: productId,
        productImage: product[0]['product_image'],
        productTitle: product[0]['product_title'],
        productPrice: product[0]['product_price'],
        productCategory: product[0]['product_category'],
        commentList: commentList
    });
});

app.post('/product/:product_id', (req, res) => {
    let productId = req.params.product_id;
    console.log(`[comment] ${req.body.comment}`);
    let comment = req.body.comment;

    let newComment = {
        "body": comment
    };
    
    let data = fs.readFileSync(__dirname + '/comment.json', 'utf8');
    commentData = JSON.parse(data);
    if (!commentData[productId - 1]) {
        let commentInit = { "product_id": productId, "comments": [] };
        commentData[productId - 1] = commentInit;
    }
    commentData[productId - 1].comments.push(newComment);
    fs.writeFileSync(__dirname + '/comment.json', JSON.stringify(commentData));

    res.redirect(`/product/${productId}`);
    // res.send(200);
    });

app.listen(3000, () => {
    console.log('Running server on localhost:3000');
});