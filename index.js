const restaurantQueryResults = [];
let totalRestaurantsFound = 0;
let currentOffset = 0;
let queryCounter = 0;
let currentRadius = 0;
let currentDistance = 0;
let splicedQueryResults = false;

function handleForm() {
    $('#restaurant-form').submit(event => {
        event.preventDefault();
        restaurantQueryResults.splice(0, restaurantQueryResults.length);
        currentOffset = 0;
        queryCounter = 0;
        splicedQueryResults = false;
        $('.restaurant').empty();
        if ($('.restaurant').hasClass('hidden')) {
            $('.restaurant').toggleClass('hidden');
        }
        $('.utensils').toggleClass('hidden');
        fetchRestaurants();
    });
}

function fetchDirections(latLong) {
    const baseURL = "https://www.mapquestapi.com/directions/v2/route?";
    const params = getDirectionsParams(latLong);
    fetch(`${baseURL}${params}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.log(response);
                throw new Error(response.statusText);
            }
        })
        .then(responseJson => displayDirections(responseJson))
        .catch(error => console.log("error", error));
}

function displayDirections(data) {
    $('.wheel').toggleClass('hidden');
    console.log(data);
    if (data.info.statuscode !== 0) {
        $('.directions').html(
            `<h2>Error:</h2>
            <p>Unable to find directions from the location you entered.</p>
            <p>Please check your input for typos and be sure to enter a valid address.</p>`
        );
        $(document).ready(() => {
            $('html, body').animate({
                scrollTop: $('.directions').offset().top
            }, 'slow');
        });
    } else {
        const directionsHTMLArray = [];
        const totalDistance = roundNumber(data.route.distance, 0.25);
        const totalTime = roundNumber(data.route.realTime / 60, 1);
        const legs = data.route.legs;
        for (let leg of legs) {
            for (let i = 0; i < leg.maneuvers.length; i++) {
                console.log(leg.maneuvers[i]);
                if (i < leg.maneuvers.length - 1) {
                    const mapURL = fetchDirectionsStepMapURL(`https${leg.maneuvers[i]["mapUrl"].slice(4)}`);
                    directionsHTMLArray.push(`
                        <li>
                            <p><img src="https${leg.maneuvers[i]["iconUrl"].slice(4)}" alt="direction-icon"> ${leg.maneuvers[i]["narrative"]}</p>
                            <img src="${mapURL}" alt="route-map-maneuver-${i+1}">
                            <p>After you travel approximately ${formatDistance(leg.maneuvers[i]["distance"])} and after about ${formatTime(leg.maneuvers[i]["time"])}:</p> 
                        </li>`);
                } else {
                    directionsHTMLArray.push(`
                        <li>
                            <p><img src="https${leg.maneuvers[i]["iconUrl"].slice(4)}" alt="direction-icon"> ${leg.maneuvers[i]["narrative"]}</p>
                            <p>You will have reached your destination.</p> 
                        </li>`);
                }
            }
        }
        $('.directions').html(`
            <p><b>Length of journey:</b> ${totalDistance} mi.</p>
            <p><b>Estimated time to reach destination:</b> ${totalTime} min.</p>
            <ol>
                ${directionsHTMLArray.join('\r')}
            </ol>
            `);
        $(document).ready(() => {
            $('html, body').animate({
                scrollTop: $('.directions').offset().top
            }, 'slow');
        });
    }
}

function fetchDirectionsStepMapURL(mapBaseURL) {
    const marker1Coordinates = mapBaseURL.split(/(locations=|\|marker|\|\|)/g)[2].split(",").map(num => parseFloat(num));
    const marker2Coordinates = mapBaseURL.split(/(locations=|\|marker|\|\|)/g)[6].split(",").map(num => parseFloat(num));
    let bounds;
    if (marker1Coordinates[0] > marker2Coordinates[0] && marker1Coordinates[1] > marker2Coordinates[1]) {
        bounds = `${marker1Coordinates[0]},${marker2Coordinates[1]},${marker2Coordinates[0]},${marker1Coordinates[1]}`;
    }
    if (marker1Coordinates[0] > marker2Coordinates[0] && marker1Coordinates[1] < marker2Coordinates[1]) {
        bounds = `${marker1Coordinates[0]},${marker1Coordinates[1]},${marker2Coordinates[0]},${marker2Coordinates[1]}`;
    }
    if (marker1Coordinates[0] < marker2Coordinates[0] && marker1Coordinates[1] < marker2Coordinates[1]) {
        bounds = `${marker2Coordinates[0]},${marker1Coordinates[1]},${marker1Coordinates[0]},${marker2Coordinates[1]}`;
    }
    if (marker1Coordinates[0] < marker2Coordinates[0] && marker1Coordinates[1] > marker2Coordinates[1]) {
        bounds = `${marker2Coordinates[0]},${marker2Coordinates[1]},${marker1Coordinates[0]},${marker1Coordinates[1]}`;
    }
    return `${mapBaseURL.replace(/&center.+&d/g, `&boundingBox=${bounds}&d`)}&margin=20`;
}

function formatTime(seconds) {
    return `${roundNumber(seconds / 60, 0.25)} min.`;
}

function formatDistance(miles) {
    if (miles < 0.25) {
        return `${roundNumber(miles * 5280, 1)} ft.`;
    } 
    else {
        return `${roundNumber(miles, 0.25)} mi.`;
    }
}

function roundNumber(x, precision) {
    let y = + x + (precision === undefined ? 0.5 : precision / 2);
    return y - (y % (precision === undefined ? 1 : + precision));
}

function getDirectionsParams(latLong) {
    const key = "Nm7BvCgkqE4CwDRloh8s14FNG4NPdjSp";
    const from = fetchDeparturePoint();
    const to = latLong;
    const routeType = fetchRouteType();
    const narrativeType = "html";
    const paramsObject = {
        key,
        from,
        to,
        routeType,
        narrativeType
    };
    const paramsArray = [];
    Object.keys(paramsObject).forEach(key => {
        paramsArray.push(`${key}=${paramsObject[key]}`);
    });
    return paramsArray.join('&');
}

function fetchRouteType() {
    if ($('#mode').val()) {
        return $('#mode').val();
    } else {
        return "fastest";
    }
}

function fetchDeparturePoint() {
    if ($('#street').val()) {
        const street = $('#street').val();
        const city = $('#city').val();
        const state = $('#state').val();
        return `${street}, ${city}, ${state}`;
    } else {
        return $('#location').val();
    }
}

function fetchRestaurants() {
    const baseURL = "https://api.foursquare.com/v2/venues/explore?"
    const params = getQueryParams();
    fetch(`${baseURL}${params}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else if (response.status === 400) {
                $('.utensils').toggleClass('hidden');
                $('.restaurant').html(
                    `<h2>Error:</h2>
                    <p>The location "${$('#location').val()}" could not be found.  
                    Check for typos or alter the format of your query.</p>
                    <p><b>For example:</b> enter a zipcode (10010) or enter a state following a city (New York, NY).</p>`
                );
                $(document).ready(() => {
                    $('html, body').animate({
                        scrollTop: $('.restaurant').offset().top
                    }, 'slow');
                });
                console.log(response);
                throw new Error(response.statusText);
            } else {
                console.log(response);
                throw new Error(response.statusText);
            }
        })
        .then(responseJson => {
            console.log(queryCounter, responseJson)
            loadRestaurants(responseJson);
        })
        .catch(error => console.log('error', error));
}

function loadRestaurants(data) {
    totalRestaurantsFound = data.response.totalResults;
    const responseGroupsArray = data.response.groups;
    for (let responseGroup of responseGroupsArray) {
        if (totalRestaurantsFound === 0) {
            $('.utensils').toggleClass('hidden');
            $('.restaurant').html("<p>Sorry, no restaurant found that matches those parameters.  Try again with different parameters.</p>")
        } else if (queryCounter === 10 && restaurantQueryResults.length === 0) {
            $('.utensils').toggleClass('hidden');
            $('.restaurant').html("<p>Sorry, looks like something went wrong.  Try again with different parameters.</p>")
        } else if (queryCounter === 10 && restaurantQueryResults.length !== 0) {
            pickRestaurant();
        } else {
            currentOffset += responseGroup.items.length;
            restaurantQueryResults.push(...responseGroup.items);
            if (restaurantQueryResults.length < totalRestaurantsFound) {
                queryCounter += 1;
                fetchRestaurants();
            } else {
                pickRestaurant();
            }
        }
    }
}

function displayRandomRestaurant(data) {
    if (!$('.utensils').hasClass('hidden')) {
        $('.utensils').toggleClass('hidden');
    }
    console.log(data);
    const restaurantInfo = data.response.venue;
    const restaurantInfoKeys = Object.keys(restaurantInfo);
    const name = restaurantInfo.name;
    const phoneNumber = fetchPhoneNumber(restaurantInfo, restaurantInfoKeys);
    const addressHTML = fetchRestaurantAddressHTML(restaurantInfo, restaurantInfoKeys);
    const latLong = fetchLatLong(restaurantInfo, restaurantInfoKeys);
    const urlHTML = fetchURLHTML(restaurantInfo, restaurantInfoKeys);
    const categoriesHTML = fetchCategoriesHTML(restaurantInfo, restaurantInfoKeys);
    const priceHTML = fetchPriceHTML(restaurantInfo, restaurantInfoKeys);
    const menuHTML = fetchMenuHTML(restaurantInfo, restaurantInfoKeys);
    const ratingHTML = fetchRestaurantRatingHTML(restaurantInfo, restaurantInfoKeys);
    const hoursHTML = fetchHoursHTML(restaurantInfo, restaurantInfoKeys);
    const attributesHTML = fetchAttributesHTML(restaurantInfo, restaurantInfoKeys);
    const bestPhotoHTML = fetchBestPhotoHTML(restaurantInfo, restaurantInfoKeys);
    const foodPhotoHTML = fetchFoodPhotoHTML(restaurantInfo, restaurantInfoKeys);
    $('.restaurant').html(`
        <h2>${name}</h2>
        ${bestPhotoHTML}<br>
        ${urlHTML}
        <p><b>Phone:</b> ${phoneNumber}</p>
        <h3>Address: </h3>
            <ul class="address-list">
                ${addressHTML}
            </ul>
        <div id="map">
        </div>
        <h3>Categories: </h3>
            <ul>
                ${categoriesHTML}
            </ul>
        ${foodPhotoHTML}
        <h3>Price, Menu, and Rating Info: </h3>
        ${priceHTML}
        ${menuHTML}
        ${ratingHTML}
        <h3>Hours: </h3>
            <ul>
                ${hoursHTML}
            </ul>
        <h3>More about this restaurant: </h3>
            <ul>
                ${attributesHTML}
            </ul>
        <h2>Not interested in this restaurant?</h2>
        <p>Click below to fetch a different restaurant using the same search criteria</p>
        <button type="button" id="display-different-r">Spin again!</button>
    `);
    if (latLong) {
        fetchMap(latLong);
    } else {
        $('.restaurant').append("<p>Sorry, directions not available for this location.</p>");
    }
    $('#display-different-r').on("click", () => {
        $('#directions-form').remove();
        $('.directions').remove();
        $('.restaurant').empty();
        $('.utensils').toggleClass('hidden');
        pickRestaurant();
    });
    $(document).ready(() => {
        $('html, body').animate({
            scrollTop: $('.restaurant').offset().top
        }, 'slow');
    });
}

function fetchMap(latLong) {
    loadMap(latLong);
    $('.restaurant').append(`
        <form id="directions-form">
            <fieldset>
                <legend>If you'd like directions, please provide an address for the point of departure</legend>
                <div class="departure-container">
                    <label for="mode">Mode of travel: </label>
                    <select id="mode">
                        <option value="fastest">Driving</option>
                        <option value="pedestrian">Walking</option>
                        <option value="bicycle">Cycling</option>
                    </select>
                    <label for="street">Street: </label>
                    <input type="text" id="street" name="street" required>
                    <label for="city">City: </label>
                    <input type="text" id="city" name="city" required>
                    <label for="state">State: </label>
                    <input type="text" id="state" name="state">
                    <button type="submit">Find Directions</button>
                </div>
            </fieldset>
        </form>
    `);
    $('#directions-form').submit(event => {
        event.preventDefault();
        $('.wheel').toggleClass('hidden');
        $('.directions').remove();
        $('.restaurant').append('<div class="directions"></div>');
        fetchDirections(latLong);
    });
}

function fetchFoodPhotoHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('photos')) {
        const photosHTMLArray = [];
        for (let group of restaurantInfo.photos.groups) {
            if (group.items.length > 1) {
                photosHTMLArray.push(`<img class="food-photo" src="${group.items[1].prefix}original${group.items[1].suffix}" alt="restaurant photo">`);
            }
        }
        if (photosHTMLArray.length !== 0) {
            return photosHTMLArray.join('\r');
        } else {
            return "<p>Sorry, no photos of food available.</p>";
        }
    } else {
        return "<p>Sorry, no photos of food available.</p>";
    }
}

function fetchBestPhotoHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('bestPhoto')) {
        const prefix = restaurantInfo.bestPhoto.prefix;
        const suffix = restaurantInfo.bestPhoto.suffix;
        return `<img src="${prefix}original${suffix}" alt="restaurant photo" class="restaurant-best-photo">`;
    } else {
        return "<p>Sorry, no image available for this restaurant.</p>";
    }
}

function loadMap(latLong) {
    const centerCoordinates = latLong.split(",").map(num => parseFloat(num)).reverse();
    console.log(centerCoordinates);
    mapboxgl.accessToken = 'pk.eyJ1IjoibGthcnBlciIsImEiOiJjazh1NzRhZzMwN3hwM2VwNG0xZnM3c2JqIn0.dD8wiLFpEkdBZOdZt7N6VA';
    let map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: centerCoordinates,
        zoom: 15
    });
    map.addControl(new mapboxgl.NavigationControl());
    const marker = new mapboxgl.Marker()
        .setLngLat(centerCoordinates)
        .addTo(map);
}

function fetchLatLong(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('location')) {
        const lat = restaurantInfo.location.lat;
        const lng = restaurantInfo.location.lng;
        return `${lat},${lng}`;
    } else {
        return false;
    }
}

function fetchURLHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('canonicalUrl')) {
        return `<a href="${restaurantInfo.canonicalUrl}" target="_blank">View Restaurant on Foursquare</a>`;
    } else {
        return "<p>Restaurant url not available.</p>";
    }
}

function fetchPhoneNumber(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('contact')) {
        if (Object.keys(restaurantInfo.contact).includes('formattedPhone')) {
            return restaurantInfo.contact.formattedPhone;
        } else if (Object.keys(restaurantInfo.contact).includes('phone')) {
            return restaurantInfo.contact.phone;
        } else {
            return "Phone number not available.";
        }
    } else {
        return "Phone number not available.";
    }
}

function fetchAttributesHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('attributes')) {
        try {
            const attributesHTMLArray = [];
            for (let attributeObject of restaurantInfo.attributes.groups) {
                for (let item of attributeObject.items) {
                    if (item.displayName === item.displayValue) {
                        attributesHTMLArray.push(`<li>${item.displayName}</li>`);    
                    } else {
                        attributesHTMLArray.push(`<li>${item.displayName}: ${item.displayValue}</li>`);
                    }
                }
            }
            return attributesHTMLArray.join('\r');
        } catch (e) {
            console.log(e);
            return "<li>Sorry, no attributes available</li>";
        }
    } else {
        return "<li>Sorry, no attributes available</li>";
    }
}

function fetchHoursHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('hours')) {
        try {
            const hoursHTMLArray = [];
            for (let object of restaurantInfo.hours.timeframes) {
                const timesArray = []
                for (let time of object.open) {
                    timesArray.push(time.renderedTime);
                }
                hoursHTMLArray.push(`<li>${object.days}: ${timesArray.join(', ')}</li>`);
            }
            return hoursHTMLArray.join('\r');
        }
        catch(e) {
            return "<li>Sorry, hours not available</li>"
        }
    } else {
        return "<li>Sorry, hours not available</li>"
    }
}

function fetchMenuHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('hasMenu')) {
        if (restaurantInfo.hasMenu) {
            return `<a href="${restaurantInfo.menu.url}" target="_blank">View Menu on Foursquare</a>`;
        } else {
            return "<p>Menu not available.</p>";
        }
    } else {
        return "<p>Menu not available.</p>";
    }
}

function fetchRestaurantRatingHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('rating')) {
        return `<p><b>Rating:</b> ${restaurantInfo.rating}</p>`;
    } else {
        return "<p>Rating not available</p>";
    }
}

function fetchPriceHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('price')) {
        switch (restaurantInfo.price.tier) {
            case 1:
                return "<p>The average price per entree is less than $10.</p>";
            case 2:
                return "<p>The average price per entree is $10-$20.</p>";
            case 3:
                return "<p>The average price per entree is $20-$30.</p>";
            case 4:
                return "<p>The average price per entree is more than $30.</p>";
        }
    } else {
        return "<p>Sorry, no info available on pricing</p>";
    }
}

function fetchCategoriesHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('categories')) {
        const categoriesHTMLArray = [];
        for (let categoryObject of restaurantInfo.categories) {
            categoriesHTMLArray.push(`<li>${categoryObject.name}</li>`);
        }
        return categoriesHTMLArray.join('\r');
    } else {
        return "<li>Sorry, no categories available</li>";
    }
}

function fetchRestaurantAddressHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('location')) {
        try {
            const addressHTMLArray = [];
            for (let line of restaurantInfo.location.formattedAddress) {
                addressHTMLArray.push(`<li>${line}</li>`);
            }
            return addressHTMLArray.join('\r');
        }
        catch (e) {
            return "<p>Address not available</p>";
        }
    } else {
        return "<p>Address not available</p>";
    }
}

function pickRestaurant() {
    if (restaurantQueryResults.length === 0 && splicedQueryResults) {
        $('.utensils').toggleClass('hidden');
        $('.restaurant').html("<p>Sorry, no restaurant found that matches those parameters.  Try again with different parameters.</p>")
    } else {
        const randomNum = Math.floor(Math.random() * restaurantQueryResults.length);
        const randomRestaurant = restaurantQueryResults[randomNum];
        console.log(randomRestaurant);
        fetchDistance(`${randomRestaurant.venue.location.lat},${randomRestaurant.venue.location.lng}`, randomNum);
    }
}

function fetchDistance(latLong, randomNum) {
    const baseURL = "https://www.mapquestapi.com/directions/v2/route?";
    const params = getDirectionsParams(latLong);
    fetch(`${baseURL}${params}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.log(response);
                throw new Error(response.statusText);
            }
        })
        .then(responseJson => {
            console.log(responseJson, "fetchDistance results")
            setAndCheckCurrentDistance(responseJson, randomNum)})
        .catch(error => console.log("error", error));
}

function setAndCheckCurrentDistance(data, randomNum) {
    console.log("setting current distance");
    currentDistance = data.route.distance;
    console.log(currentDistance, currentRadius)
    if (currentDistance > currentRadius) {
        restaurantQueryResults.splice(randomNum, 1);
        splicedQueryResults = true;
        pickRestaurant();
    } else {
        fetchRestaurantDetails(restaurantQueryResults[randomNum].venue.id);
    }
}

function fetchRestaurantDetails(id) {
    const baseURL = "https://api.foursquare.com/v2/venues/";
    const clientID = "client_id=4MRDI4UFA2MFILISD0LH1WB2WZWQVP42WUECJQQ44HFPZUPV";
    const clientSecret = "client_secret=C2DTDQYT5VWKD3OXJTBOVHHGWOPIREMU41UQND25GEJFP2ME";
    const v = "v=20200408";
    fetch(`${baseURL}${id}?${clientID}&${clientSecret}&${v}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.log(response);
                throw new Error(response.statusText);
            }
        })
        .then(responseJson => displayRandomRestaurant(responseJson))
        .catch(error => console.log('error', error));
}

function getQueryParams() {
    const client_id = "4MRDI4UFA2MFILISD0LH1WB2WZWQVP42WUECJQQ44HFPZUPV";
    const client_secret = "C2DTDQYT5VWKD3OXJTBOVHHGWOPIREMU41UQND25GEJFP2ME";
    const near = setLocation();
    const limit = 50;
    const categoryId = fetchCategories();
    const v = "20200408";
    const radius = fetchRadius();
    const price = fetchPrice();
    const offset = currentOffset;
    const queryParamsObject = {
        client_id,
        client_secret,
        near,
        limit,
        categoryId,
        v,
        radius,
        price,
        offset
    };
    const queryParamsArray = [];
    Object.keys(queryParamsObject).forEach(key => {
        queryParamsArray.push(`${key}=${queryParamsObject[key]}`);
    })
    return queryParamsArray.join('&');
}

function fetchPrice() {
    const price = [];
    for (let i = 1; i <= 4; i++) {
        if ($(`#${i}`).prop('checked')) {
            price.push(i);
        }
    }
    if (price.length === 0) {
        return "1,2,3,4";
    } else {
        return price.join(',');
    }
}

function setLocation() {
    return $('#location').val();
}

function fetchCategories() {
    const clickedCategories = [];
    const categories = [
        "African",
        "American",
        "Asian",
        "BBQ",
        "Bagels",
        "Bakery",
        "Bistro",
        "Breakfast",
        "Buffet",
        "Burgers",
        "Café",
        "Coffee-Shop",
        "Comfort-Food",
        "Deli-Bodega",
        "Diner",
        "Donuts",
        "Fast-Food",
        "French",
        "Gluten-free",
        "Halal",
        "Indian",
        "Irish",
        "Italian",
        "Latin-American",
        "Mexican",
        "Middle-Eastern",
        "Pizza",
        "Restaurant",
        "Salad",
        "Sandwiches",
        "Seafood",
        "Steakhouse",
        "Vegetarian-Vegan",
        "Wings"
    ];
    for (let category of categories) {
        if ($(`#${category}`).prop('checked')) {
            clickedCategories.push($(`#${category}`).val());
        }
    }
    if (clickedCategories.length === 0) {
        return "4bf58dd8d48988d1c4941735";
    } else {
        return clickedCategories.join(',');
    }
}

function fetchRadius() {
    const distance = $('#radius').val();
    currentRadius = parseInt(distance);
    return distance * 1609;
}

$(handleForm);
