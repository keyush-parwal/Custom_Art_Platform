const express = require("express");
const router = express.Router();
const loggedIn = require("../controllers/loggedIn")
const logout = require("../controllers/logout")
const client = require("../routes/db-config");
const alert = require("alert");
const PUBLISHABLE_KEY = "pk_test_51LyvzUSGTQJmdgEsr8c80cw8MOSYU7h2L8tvss2myGiGiLScYqOM4noKa0kvY8BfeFwpWpdiKFRyFNBXYPYyuSNu00F6AudzJ5";
const SECRET_KEY = "sk_test_51LyvzUSGTQJmdgEs948cuMmM7u4YIzSc6Ni6IrefC9NpotHjWhxSGnlRpdqfeLCLnmGzumQKgD3gzt12gi9LmAVV00OBVFQQVw";

const stripe = require('stripe')(SECRET_KEY);

//we used multer to store the uploaded images in our images folder in public directory
const multer = require('multer')
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images')
    },

    filename: (req, file, cb) => {
        // console.log(file)
        cb(null, file.originalname)
    }
})



//this directs us to the home(index.ejs) page and sends the images array that contains name, cost, file_name of images
router.get("/", loggedIn, (req, res) => {
    const images = [];
    client.query('SELECT * FROM designs', async (err, results) => {
        if (err) throw err;
        // console.log(results.rows);

        for (const item of results.rows) {
            const id = item.design_id;
            const img = '/images/' + item.file_name;
            const des_name = item.design_name;
            const cost = item.cost + 500;
            images.push({ id, img, des_name, cost });
        }
        // console.log(images);

        if (req.user) {
            console.log("Loggedin");
            console.log(req.user);
            res.render("index", { status: "loggedIn", user: req.user, images });
        }
        else {
            console.log("notloggedin");
            res.render("index", { status: "no", user: "nothing", images })
        }


    })

})

//for giving results according to the searches
router.post("/", loggedIn, (req, res) => {
    const images = [];
    client.query('SELECT * FROM designs WHERE genre = $1', [req.body.genre], async (err, results) => {
        if (err) throw err;
        // console.log(results.rows);

        for (const item of results.rows) {
            const id = item.design_id;
            const img = '/images/' + item.file_name;
            const des_name = item.design_name;
            const cost = item.cost + 500;
            images.push({ id, img, des_name, cost });
        }
        // console.log(images);

        if (req.user) {
            console.log("Loggedin");
            console.log(req.user);
            res.render("index", { status: "loggedIn", user: req.user, images });
        }
        else {
            console.log("notloggedin");
            res.render("index", { status: "no", user: "nothing", images })
        }


    })

})





//get request to send us to the register page for new user to register
router.get("/register", (req, res) => {
    res.sendFile("register.html", { root: "./public/" });
})


//get request to send us to login page for registered user to login
router.get("/login", (req, res) => {
    res.sendFile("login.html", { root: "./public/" });
})

router.get("/register_success", (req, res) => {
    res.render("register_success");
})


//get reguest to take us to the upload image page
router.get("/upload", (req, res) => {
    const mess = "";
    res.render("upload", { mess });
})


const upload = multer({ storage: storage })


//post request that will store the image details in the database
router.post("/upload", loggedIn, upload.single("image"), (req, res) => {

    console.log(req.body);

    client.query('INSERT INTO designs(user_id, design_name, file_name, cost, genre) VALUES($1, $2, $3, $4, $5)', [req.user.user_id, req.body.des_name, req.file.originalname, req.body.cost, req.body.genre], (err, results) => {
        if (err) throw err;
        // console.log(req.body);
        const mess = "Your design has been uploaded";
        res.render("upload", { mess })

    })




});

//for getting to the profile page
router.get("/profile", loggedIn, (req, res) => {

    res.render("profile", { user: req.user });
})

//for viewing the uploaded designs
router.get("/user_designs", loggedIn, (req, res) => {

    const images = [];
    client.query('SELECT * FROM designs WHERE user_id = $1', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        // console.log(results.rows);

        for (const item of results.rows) {
            const id = item.design_id;
            const img = '/images/' + item.file_name;
            const des_name = item.design_name;
            const cost = item.cost;
            const sales = item.sales;
            images.push({ id, img, des_name, cost, sales });
        }
        // console.log(images);

        res.render("user_designs", { images });


    })

})



//for deleting a design
router.post("/delete_design", loggedIn, (req, res) => {
    console.log(req.body.del);
    const t = 5;
    console.log(t);
    client.query('DELETE FROM designs WHERE design_id = $1 ', [req.body.del], async (err, results) => {
        if (err) throw err;
        console.log(results);
        alert("Design Deleted");
        res.redirect("user_designs");
    })

})

//for adding item to cart
router.post("/add_to_cart", loggedIn, (req, res) => {
    if (req.user) {
        console.log(req.body);
        const a = req.body.des_id;
        let b = "white";
        if (req.body.tshirt_color == "#fff") {
            b = "White";
        }
        else if (req.body.tshirt_color == "#000") {
            b = "Black";
        }
        else if (req.body.tshirt_color == "#f00") {
            b = "Red";
        }
        else if (req.body.tshirt_color == "#008000") {
            b = "Green";
        }
        else {
            b = "Yellow";
        }
        // const c = req.body.tshirt_size;

        client.query('SELECT * FROM cart WHERE design_id = $1 AND user_id = $2 AND color = $3 AND size = $4 ', [a, req.user.user_id, b, req.body.tshirt_size], async (err, results) => {
            if (err) throw err;
            if (results.rowCount > 0) {
                alert("Product already present in Cart");
                res.redirect("/");
            }
            else {

                client.query('SELECT cost FROM designs WHERE design_id = $1', [a], async (err, results) => {
                    if (err) throw err;
                    const k = results.rows[0].cost + 500;
                    client.query('INSERT INTO cart(user_id, design_id, color, item_cost, size) VALUES($1, $2, $3, $4, $5)', [req.user.user_id, a, b, k, req.body.tshirt_size], async (err, results) => {
                        if (err) throw err;
                        alert("Product added to cart");
                        res.redirect("/");
                    })
                })
            }
        })
    }

    else {
        alert("You are not logged in");
    }

})

//for viewing the cart
router.get("/cart", loggedIn, (req, res) => {

    const images = [];
    client.query('SELECT d.design_id, d.file_name, d.design_name, c.color, c.item_cost, c.size FROM designs AS d, cart AS c WHERE d.design_id = c.design_id AND c.user_id = $1 ', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        // console.log(results.rows);
        console.log(results.rows);
        for (const item of results.rows) {
            const id = item.design_id;
            const img = '/images/' + item.file_name;
            const des_name = item.design_name;
            const color = item.color;
            const cost = item.item_cost;
            const size = item.size

            images.push({ id, img, des_name, color, cost, size });
        }
        // console.log(images);

        res.render("cart", { images });


    })



})

//for removing image from cart
router.post("/remove_cart", loggedIn, (req, res) => {
    client.query('DELETE FROM cart WHERE design_id = $1 AND user_id = $2 AND color = $3 AND size = $4', [req.body.rem, req.user.user_id, req.body.remco, req.body.remsi], async (err, results) => {
        if (err) throw err;
        console.log(results);
        alert("Product Removed From Cart");
        res.redirect("cart");
    })

})

//for transaction details
router.get("/bank_details", loggedIn, (req, res) => {
    client.query('SELECT * FROM bank_details WHERE user_id = $1', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        if (results.rowCount > 0) {
            alert("You have already entered the details, entering them again will lead to the consideration of most recent details");
            res.render("bank_details");
        }
        else {
            res.render("bank_details");
        }

    })
})

//for submitting transaction details
router.post("/bank_details", loggedIn, (req, res) => {

    client.query('SELECT * FROM bank_details WHERE user_id = $1', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        if (results.rowCount > 0) {
            client.query('UPDATE bank_details SET holder_name = $1, account_number = $2, ifsc_code = $3 WHERE user_id = $4', [req.body.holder_name, req.body.account_no, req.body.ifsc_code, req.user.user_id], async (err, results) => {
                if (err) throw err;
                alert("Your transaction details are saved");
                res.redirect("profile");
            })
        }
        else {
            client.query('INSERT INTO bank_details(user_id, holder_name, account_number, ifsc_code) VALUES($1, $2, $3, $4)', [req.user.user_id, req.body.holder_name, req.body.account_no, req.body.ifsc_code], async (err, results) => {
                if (err) throw err;
                alert("Your transaction details are saved");
                res.redirect("profile");
            })
        }

    })


})


//for seeing the design on t-shirt
router.post("/t_shirt", loggedIn, (req, res) => {
    const id = req.body.t_shirt;
    client.query('SELECT file_name FROM designs WHERE design_id = $1', [id], async (err, results) => {
        if (err) throw (err);
        file_name = '/images/' + results.rows[0].file_name;
        res.render("t_shirt", { file_name, id });
    })

})

//for taking receiver's details
router.get("/receiver_details", loggedIn, (req, res) => {

    client.query('SELECT SUM(item_cost) FROM cart WHERE user_id = $1', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        if (results.rows[0].sum > 0) {

            res.render("receiver_details");
        }
        else {
            alert("You have no items in cart");
            res.redirect("cart");
        }

    })


})

//confirmation page
router.post("/confirm", loggedIn, (req, res) => {

    const rec_name = req.body.receiver_name;
    const rec_no = req.body.phone_no;
    const address = req.body.address;

    client.query('SELECT * FROM cart WHERE user_id = $1', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        for (const item of results.rows) {
            const d_id = item.design_id;
            const color = item.color;
            const cost = item.item_cost;
            const size = item.size;

            client.query('INSERT INTO orders(user_id, design_id, color, item_cost, customer_name, customer_phone_no, customer_address, size) values($1, $2, $3, $4, $5, $6, $7, $8)', [req.user.user_id, d_id, color, cost, rec_name, rec_no, address, size], async (err, results) => {
                if (err) throw err;
            })

            client.query('UPDATE designs SET sales = sales + 1 WHERE design_id = $1', [d_id], async (err, results) => {
                if (err) throw err;
            })
        }


        res.render("confirm");
    })

})


//for making a payment
router.get("/payment", loggedIn, (req, res) => {


    client.query('SELECT SUM(item_cost) FROM cart WHERE user_id = $1', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        if (results.rows[0].sum > 0) {
            const a = results.rows[0].sum * 100;
            client.query('DELETE FROM cart WHERE user_id = $1', [req.user.user_id], async (err, results) => {
                if (err) throw err;
            })
            res.render("payment", {
                key: PUBLISHABLE_KEY,
                cost: a
            });



        }
        else {
            alert("You have no items in cart");
            res.redirect("cart");
        }

    })

})

//once the payment is made
router.post('/payment', function (req, res) {

    res.render("success");

    // Moreover you can take more details from user
    // like Address, Name, etc from form
    // stripe.customers.create({
    //     email: req.body.stripeEmail,
    //     source: req.body.stripeToken,
    //     name: 'Gourav Hammad',
    //     address: {
    //         line1: 'TC 9/4 Old MES colony',
    //         postal_code: '452331',
    //         city: 'Indore',
    //         state: 'Madhya Pradesh',
    //         country: 'India',
    //     }
    // })
    //     .then((customer) => {

    //         return stripe.charges.create({
    //             amount: 2500,     // Charging Rs 25
    //             description: 'Web Development Product',
    //             currency: 'INR',
    //             customer: customer.id
    //         });
    //     })
    //     .then((charge) => {
    //         res.send("Success")  // If no error occurs
    //     })
    //     .catch((err) => {
    //         res.send(err)       // If some error occurs
    //     });

})

// router.get("/success", (req,res) =>{
//     res.render("success");
// })

//for viewing purchased items
router.get("/purchased_items", loggedIn, (req, res) => {

    const images = [];
    client.query('SELECT d.design_id, d.file_name, d.design_name, o.color, o.item_cost, o.size FROM designs AS d, orders AS o WHERE d.design_id = o.design_id AND o.user_id = $1 ', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        // console.log(results.rows);
        console.log(results.rows);
        for (const item of results.rows) {
            const id = item.design_id;
            const img = '/images/' + item.file_name;
            const des_name = item.design_name;
            const color = item.color;
            const cost = item.item_cost;
            const size = item.size

            images.push({ id, img, des_name, color, cost, size });
        }
        // console.log(images);

        res.render("purchased_items", { images });


    })





})

//delete account functionality for user
router.get('/del_acc', loggedIn, (req, res) => {
    client.query('DELETE FROM customer WHERE user_id = $1', [req.user.user_id], async (err, results) => {
        if (err) throw err;
        alert("Account Deleted");
        res.redirect("/");
    })
})

//about us and terms and conditions
router.get('/about', loggedIn, (req, res) => {
    res.render("about");
})


//for going on the admin page
router.get('/admin', (req, res) => {
    res.render("admin_page");
})



//for deleting a design by admin
router.post('/admin1', (req, res) => {
    client.query('SELECT * FROM designs WHERE design_name = $1', [req.body.des_name], async (err, results) => {
        if (err) throw err;
        if (results.rowCount > 0) {
            client.query('DELETE FROM designs WHERE design_name = $1', [req.body.des_name], async (err, results) => {
                if (err) throw err;
                alert("Design is deleted");
                res.render("admin_page");
            })
        }
        else {
            alert("No such design registered");
            res.render("admin_page");
        }
    })
})

//for deleting a user by admin
router.post('/admin2', (req, res) => {
    client.query('SELECT * FROM customer WHERE username = $1', [req.body.username], async (err, results) => {
        if (err) throw err;
        if (results.rowCount > 0) {
            client.query('DELETE FROM customer WHERE username = $1', [req.body.username], async (err, results) => {
                if (err) throw err;
                alert("User's account is deleted");
                res.render("admin_page");
            })
        }
        else {
            alert("No such user is registered");
            res.render("admin_page");
        }
    })
})

//for viewing the placed orders for admin
router.get("/admin_orders", (req, res) => {

    const images = [];
    client.query('SELECT d.design_id, d.file_name, d.design_name, o.user_id, o.color, o.item_cost, o.customer_address, o.size, o.prod_id FROM designs AS d, orders AS o WHERE o.design_id = d.design_id AND o.prod_id NOT IN (SELECT prod_id FROM shipped_orders)', async (err, results) => {
        if (err) throw err;
        // console.log(results.rows);
        console.log(results.rows);
        for (const item of results.rows) {
            const id = item.design_id;
            const img = '/images/' + item.file_name;
            const des_name = item.design_name;
            const user_id = item.user_id;
            const color = item.color;
            const cost = item.item_cost;
            const address = item.customer_address;
            const size = item.size;
            const prod_id = item.prod_id;

            images.push({ id, img, des_name, user_id, color, cost, address, size, prod_id });
        }
        console.log(images);

        res.render("admin_orders", { images });


    })




})

router.post("/ship", loggedIn, (req, res) => {
    client.query('SELECT user_id, design_id, color, item_cost, size FROM orders WHERE prod_id = $1', [req.body.prod_id], async (err, results) => {
        if (err) throw err;
        client.query('INSERT INTO shipped_orders values($1, $2, $3, $4, $5, $6)', [req.body.prod_id, results.rows[0].user_id, results.rows[0].design_id, results.rows[0].color, results.rows[0].item_cost, results.rows[0].size], async (err, results) => {
            if (err) throw err;
        })
        alert('Product sent for shipping');
        res.redirect("admin_orders");
    })
})






module.exports = router;