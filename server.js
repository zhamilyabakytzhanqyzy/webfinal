const express= require('express');
const cors= require('cors');
const multer= require('multer');
const path= require('path');
const db = require('./db');

const app= express();
app.use (cors());
app.use (express.json());
app.use ('/uploads', express.static(path.join(__dirname, 'uploads')));
const storage = multer.diskStorage({
    destination:(req, file, cb)=> {
       cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload =multer({ storage: storage });
app.post('/api/products', upload.single('image'), async (req,res) => {
    try{
        const { name, category, description, price} =req.body;
        const image_url=req.file? '/uploads/${req.file.filename}' : '';
        if (!name || !category || !description || !price){

        }
        if (description.length >100){
            return res.status(400).json({ error: 'All fields are required'});
        }
        const numericPrice= Number(price);
        if (numericPrice <50 || numericPrice > 500){
            return res.status(400).json({ error: 'Price must be between 50 and 500'});
    }
    const query ='INSERT INTO products (name, category, description, price, image_url) VALUES (?, ?, ?, ?, ?)';
    const [result]=await db.execute (query, [name,category,description,price,image_url]);
    res.status(201).json({
        message: "Product added successfully!",
        productID: result.insertID
    });
} catch (error){
    console.error(error);
    res.status(500).json({ error: 'Databse server error'});
}

});
app.get('/api/products', async (req,res) => {
    try{
        const allProducts =await db.select().from(products);
        res.json(allProducts);

    } catch (error){
        console.error(error); {
            res.status(500).json({ error:'Failed to fetch products'});
        }
    }
    });


const PORT = 3000;
app.listen(PORT, () => {
    console.log(
        `Server running on http://localhost:${PORT}`);
});
