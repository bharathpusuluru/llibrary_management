document.getElementById('search-form').addEventListener('submit', async function(event) {
    event.preventDefault();
  
    const title = document.getElementById('search-title').value;
    const author = document.getElementById('search-author').value;
    const publisher = document.getElementById('search-publisher').value;
  
    const response = await axios.get('/search', {
      params: { title, author, publisher }
    });
  
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.innerHTML = '';
  
    for (const book of response.data) {
      const bookDiv = document.createElement('div');
      bookDiv.textContent = `Title: ${book.title}, Author: ${book.author}, Publisher: ${book.publisher}`;
      resultsDiv.appendChild(bookDiv);
    }
});
