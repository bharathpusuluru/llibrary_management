document.getElementById('borrow-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const bookId = document.getElementById('bookId').value;

    console.log(`Submitting form with user ID ${userId} and book ID ${bookId}`);

    const response = await fetch('/borrow', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, bookId })
    });

    const data = await response.json();

    document.getElementById('message').innerText = data.message;
});
