// script.js
document.getElementById('textForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const inputText = document.getElementById('inputText').value;

    fetch('/saveText', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        alert('Text saved successfully!');
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});
// Fetch and display saved texts
fetch('/getTexts')
    .then(response => response.json())
    .then(data => {
        console.log('Saved texts:', data);
        data.forEach(item => {
            console.log(item.text);
        });
    })
    .catch((error) => {
        console.error('Error:', error);
    });
