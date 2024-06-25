document.addEventListener('DOMContentLoaded', function () {
    fetch('/current-song')
      .then(response => {
        if (response.status === 401) {
          document.getElementById('login').style.display = 'block';
          document.getElementById('app').style.display = 'none';
        } else {
          document.getElementById('login').style.display = 'none';
          document.getElementById('app').style.display = 'block';
          return response.json();
        }
      })
      .then(data => {
        if (data && data.song) {
          document.getElementById('song-name').textContent = data.song.name;
          document.getElementById('artist-name').textContent = data.song.artists.map(artist => artist.name).join(', ');
          document.getElementById('song-uri').value = data.song.uri;
        }
      });
  });
  
function submitRating() {
    const rating = document.getElementById('rating').value;
    const songUri = document.getElementById('song-uri').value;
  
    // Log the data being sent
    console.log('Submitting rating:', { rating, songUri });
  
    fetch('/rate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, songUri }),
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('message').textContent = data.message || data.error;
        })
        .catch(error => {
            console.error('Error submitting rating:', error);
            document.getElementById('message').textContent = 'Error submitting rating: ' + error.message;
        });
}
