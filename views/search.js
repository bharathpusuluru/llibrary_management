document.getElementById('search-form').addEventListener('submit', async function(event) {
  // Prevent form from submitting normally
  event.preventDefault();

  // Clear previous results
  document.getElementById('results').innerHTML = '';

  // Get values from form inputs
  const title = document.getElementById('title').value;
  const author = document.getElementById('author').value;
  const publisher = document.getElementById('publisher').value;

  // Build the query string, excluding empty parameters
  let queryString = '?';
  if (title) queryString += `title=${title}&`;
  if (author) queryString += `author=${author}&`;
  if (publisher) queryString += `publisher=${publisher}&`;

  try {
    const response = await fetch(`/api/books${queryString}`);
    const books = await response.json();
    
    // Create and append new elements for each book
    books.forEach(book => {
      const bookElement = document.createElement('div');
      bookElement.innerHTML = `
        <h2>Title: ${book.title}</h2>
        <p><strong>Description:</strong> ${book.description}</p>
        <p><strong>Price:</strong> ${book.price}</p>
        <p><strong>Author:</strong> ${book.author}</p>
        <p><strong>Publisher:</strong> ${book.publisher}</p>
        <p><strong>Copies:</strong> ${book.copies.length}</p>
        <button class="borrow-button" data-book-id="${book._id}">Borrow</button>
      `;
      document.getElementById('results').appendChild(bookElement);
    });
  } catch (error) {
    console.error('Error:', error);
  }
});

