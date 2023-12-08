const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

app.set('trust proxy', 1);

app.use(session({
  secret: '1234',  // You should use your own secret key here
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set secure to true if you're using HTTPS
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'views')));

mongoose.connect('mongodb+srv://divyapusuluru:Divya2000@cluster0.zdhbusz.mongodb.net/dbms', { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
  _id: Number,
  username: String,
  password: String,
  role: String
});
const User = mongoose.model('User', UserSchema);

const BookSchema = new mongoose.Schema({
    _id: Number,
    title: String,
    description: String,
    price: Number,
    author: String,
    publisher: String,
    copies: [{
      type: mongoose.Schema.Types.Mixed // This allows storing mixed data types in the array
  }]
});
const Book = mongoose.model('Book', BookSchema);

const LoanSchema = new mongoose.Schema({
    userId: {
      type: Number,
      ref: 'User',
      required: true
    },
    bookId: {
      type: Number,
      ref: 'Book',
      required: true
    },
    borrowDate: Date,
    dueDate: Date,
    returnDate: Date
});
const Loan = mongoose.model('Loan', LoanSchema);

// Middleware to check if the user is logged in and is a manager
const isManager = (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.redirect('/user');
  }

  // Fetch the user from the database using findById() and exec()
  User.findById(userId).exec()
    .then(user => {
      if (!user || user.role !== 'library_manager') {
        return res.redirect('/user');
      }
      next();
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error' });
    });
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Received login request for username: ${username}`);

  const user = await User.findOne({ username });
  if (!user || user.password !== password) {
    console.log(`Login failed for username: ${username}`);
    return res.status(400).send('Invalid username or password');
  }

  // Store user's ID in session
  req.session.userId = user._id;  // Use _id instead of userId

  if (user.role === 'library_manager') {
    console.log(`Redirecting manager to /manager page`);
    return res.redirect('/manager');
  } else {
    console.log(`Redirecting user to /user page`);
    return res.redirect('/user');
  }
});

//Popularity
app.get('/popularity', isManager, (req, res) => {
  res.sendFile(path.join(_dirname, '/views/popularity.html'));
});

// Apply isManager middleware to the manager route
app.get('/manager', isManager, (req, res) => {
  res.sendFile(path.join(__dirname, '/views/manager.html'));
});

app.get('/user', function(req, res) {
  var userId = req.session.userId;

  User.findById(userId)
    .then(user => {
      if (user) {
        res.sendFile(path.join(__dirname, '/views/user.html'));
      } else {
        res.redirect('/login');
      }
    })
    .catch(err => {
      console.error(err);
      res.redirect('/login');
    });
});



app.get('/search', (req, res) => {
  res.sendFile(__dirname + '/views/search.html');
});

app.get('/borrow', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/borrow.html'));
});

app.get('/return', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/return.html'));
});

app.get('/search', async (req, res) => {
  let title = req.query.title || '';
  let author = req.query.author || '';
  let publisher = req.query.publisher || '';

  const books = await Book.find({
    title: new RegExp(title, 'i'),
    author: new RegExp(author, 'i'),
    publisher: new RegExp(publisher, 'i')
  });
  res.json(books);
});

app.post('/borrow', async (req, res) => {
  const { userId, bookId } = req.body;

  console.log(`Received request to borrow book with ID ${bookId} for user with ID ${userId}`);

  const user = await User.findById(userId);
  const book = await Book.findById(bookId);

  if (!user || !book) {
    return res.status(404).send('User or book not found');
  }

  const loan = new Loan({
    userId,
    bookId,
    borrowDate: new Date(),
    dueDate: new Date(new Date().getTime() + 7*24*60*60*1000)  // 7 days later
  });

  await loan.save();
  console.log('Loan saved successfully:', loan);

  res.status(200).json({ message: 'Book borrowed successfully' });

});

app.put('/return', async (req, res) => {
  const { bookId } = req.body;
  // Find the loan by the book ID, assuming that book ID and loan ID are the same
  const loan = await Loan.findOne({ bookId, returnDate: { $exists: false } });
  if (!loan) {
    return res.status(400).json({ message: 'No active loan found for this book' });
  }
  await Loan.findByIdAndUpdate(loan._id, { returnDate: new Date() });
  res.json({ message: 'Book returned successfully' });
});


app.get('/api/books', async (req, res) => {
  try {
      // Build the query dynamically
      let query = {};
      if (req.query.title) query.title = { $regex: new RegExp(req.query.title, 'i') };
      if (req.query.author) query.author = { $regex: new RegExp(req.query.author, 'i') };
      if (req.query.publisher) query.publisher = { $regex: new RegExp(req.query.publisher, 'i') };
      
      // Fetch books from MongoDB
      const books = await Book.find(query);
      
      // Send the books back as a response
      res.json(books);
  } catch (err) {
      // Handle any errors
      console.error("Error occurred: ", err);
      res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/popularBooks', async (req, res) => {
  try {
    // Aggregate loans to count the number of times each book was loaned
    const popularBooks = await Loan.aggregate([
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Fetch book details for each book
    const booksDetails = [];
    for (let book of popularBooks) {
      let bookDetails = await Book.findById(book._id); // Assuming 'Book' is your book model
      booksDetails.push({
        title: bookDetails.title,
        author: bookDetails.author,
        publisher: bookDetails.publisher,
        timesBorrowed: book.count
      });
    }

    // Send the books back as a response
    res.json(booksDetails);
  } catch (err) {
    // Handle any errors
    console.error("Error occurred: ", err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/popularity', isManager, (req, res) => {
  res.sendFile(path.join(__dirname, '/views/popularity.html')); // Fixed _dirname to __dirname
});


app.get('/loan', async (req, res) => {
  console.log('Received GET /loan request');  // Logs whenever a request is received at this endpoint

  const userId = req.session.userId;
  
  console.log('User ID from session:', userId);  // Logs the user ID stored in the session

  if (!userId) {
    return res.status(401).json({ message: 'User is not logged in' });
  }

  const loans = await Loan.find({ userId, returnDate: null }).exec();
  console.log('Loans found for user:', loans);  // Logs the loans found for the user

  res.json(loans);
});




app.post('/return', async (req, res) => {
  const { userId, bookId } = req.body;

  // Find the loan by the book ID, assuming that book ID and loan ID are the same
  const loan = await Loan.findOne({ bookId, returnDate: { $exists: false } });
  if (!loan) {
    return res.status(400).json({ message: 'No active loan found for this book' });
  }
  await Loan.findByIdAndUpdate(loan._id, { returnDate: new Date() });
  res.json({ message: 'Book returned successfully' });
});



// Here, I've left placeholders where you need to implement your logic
// Add a new book (Manager-only route)
app.post('/books', isManager, async (req, res) => {
  const { _id, title, description, price, author, publisher, copies } = req.body;

  try {
    // Check if a book with the given _id already exists
    const existingBook = await Book.findById(_id);
    if (existingBook) {
      return res.status(409).json({ message: 'Book with the same ID already exists' });
    }

    // Create a new Book object
    const newBook = new Book({
      _id,
      title,
      description,
      price,
      author,
      publisher,
      copies
    });

    // Save the new book to the database
    await newBook.save();
    console.log('New book added successfully:', newBook);

    res.status(200).json({ message: 'New book added successfully' });
  } catch (error) {
    console.error('Error occurred while adding a new book:', error);
    res.status(500).json({ message: 'An error occurred while adding a new book' });
  }
});


// ... (Previous code)

// ... (Previous code)
// Server-side route handler for updating a book
app.put('/books/:bookId', isManager, async (req, res) => {
  const bookId = req.params.bookId;
  const { title, description, price, author, publisher } = req.body;

  try {
    // Find the book by ID and update its properties
    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      { title, description, price, author, publisher },
      { new: true } // Return the updated document
    );

    // Check if the book was found and updated
    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json({ message: 'Book updated successfully', book: updatedBook });
  } catch (error) {
    console.error('Error occurred while updating book:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



// Add a copy for a book (Manager-only route)
// Server-side route handler for adding a copy to a book
app.put('/books/:bookId/add-copy', isManager, async (req, res) => {
  const bookId = req.params.bookId;

  try {
    // Find the book by ID and add a copy to the "copies" array
    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      { $push: { copies: {} } },
      { new: true } // Return the updated document
    );

    // Check if the book was found and updated
    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json({ message: 'Copy added successfully', book: updatedBook });
  } catch (error) {
    console.error('Error occurred while adding copy:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


// Remove a copy for a book (Manager-only route)
// Remove a copy for a book (Manager-only route)
app.put('/books/:bookId/remove-copy', isManager, async (req, res) => {
  const bookId = req.params.bookId;

  try {
    // Find the book by ID
    const book = await Book.findById(bookId);
    
    // Check if the book was found
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check if there are any copies to remove
    if (book.copies.length === 0) {
      return res.status(400).json({ message: 'No copies available to remove' });
    }

    // Remove the first copy from the "copies" array
    book.copies.splice(0, 1);

    // Save the updated book to the database
    await book.save();

    return res.status(200).json({ message: 'Copy removed successfully', book });
  } catch (error) {
    console.error('Error occurred while removing copy:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});





// View all borrowing records (Manager-only route)
// View all borrowing records (Manager-only route)
app.get('/loans', isManager, async (req, res) => {
  try {
    // Fetch all borrowing records from the Loan collection
    const loans = await Loan.find({}).exec();
    return res.status(200).json(loans);
  } catch (error) {
    console.error('Error occurred while fetching borrowing records:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



// Extend the due date for a borrowing record (Manager-only route)
app.put('/loans/:loanId', isManager, async (req, res) => {
  const loanId = req.params.loanId;
  const { dueDate } = req.body;

  try {
    // Find the loan by ID and update the dueDate
    const updatedLoan = await Loan.findByIdAndUpdate(
      loanId,
      { dueDate },
      { new: true } // Return the updated document
    );

    // Check if the loan was found and updated
    if (!updatedLoan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    return res.status(200).json({ message: 'Due date extended successfully', loan: updatedLoan });
  } catch (error) {
    console.error('Error occurred while extending due date:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Server-side route handler for extending the due date for a borrowing record (Manager-only route)
// Server-side route handler for extending the due date for a borrowing record (Manager-only route)
// Server-side route handler for extending due date
app.put('/loans/:loanId/extend-due-date', isManager, async (req, res) => {
  const loanId = req.params.loanId;
  const { dueDate } = req.body;

  // Debug: Log the received request data
  console.log('Received request to extend due date:', { loanId, dueDate });

  try {
    // Find the loan by ID and update the dueDate and the extendedDueDate
    const updatedLoan = await Loan.findByIdAndUpdate(
      loanId,
      { dueDate, extendedDueDate: dueDate }, // update both dueDate and extendedDueDate
      { new: true } // Return the updated document
    );

    // Debug: Log the updated loan
    console.log('Updated loan:', updatedLoan);

    // Check if the loan was found and updated
    if (!updatedLoan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    return res.status(200).json({ message: 'Due date extended successfully', loan: updatedLoan });
  } catch (error) {
    console.error('Error occurred while extending due date:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});






app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
