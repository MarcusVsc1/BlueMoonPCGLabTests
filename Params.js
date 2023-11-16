const urlParams = new URLSearchParams(window.location.search);
var seedNumber = urlParams.get('seed');
var rooms = urlParams.get('rooms');