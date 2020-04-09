const restaurantQueryResults = [];
let totalRestaurantsFound = 0;
let currentOffset = 0;

function handleForm() {
    $('#restaurant-form').submit(event => {
        event.preventDefault();
        restaurantQueryResults.splice(0, restaurantQueryResults.length);
        currentOffset = 0;
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
    console.log(data);
    const directionsHTMLArray = [];
    const legs = data.route.legs;
    for (let leg of legs) {
        for (let i = 0; i < leg.maneuvers.length; i++) {
            console.log(leg.maneuvers[i]);
            if (i < leg.maneuvers.length - 1) {
                directionsHTMLArray.push(`
                    <li>
                        <p><img src="https${leg.maneuvers[i]["iconUrl"].slice(4)}" alt="direction-icon"> ${leg.maneuvers[i]["narrative"]}</p>
                        <img src="https${leg.maneuvers[i]["mapUrl"].slice(4)}" alt="route-map">
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
    $('.directions').html(directionsHTMLArray.join('\r'));
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
    return $('#mode').val();
}

function fetchDeparturePoint() {
    const street = $('#street').val();
    const city = $('#city').val();
    const state = $('#state').val();
    return `${street}, ${city}, ${state}`;
}

function fetchRestaurants() {
    const baseURL = "https://api.foursquare.com/v2/venues/explore?"
    const params = getQueryParams();
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
            console.log(responseJson)
            loadRestaurants(responseJson);
        })
        .catch(error => console.log('error', error));
}

function loadRestaurants(data) {
    totalRestaurantsFound = data.response.totalResults;
    const responseGroupsArray = data.response.groups;
    for (let responseGroup of responseGroupsArray) {
        currentOffset += responseGroup.items.length;
        restaurantQueryResults.push(...responseGroup.items);
    }
    if (restaurantQueryResults.length < totalRestaurantsFound) {
        fetchRestaurants();
    } else {
        pickRestaurant();
    }
}

function displayRandomRestaurant(data) {
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
    $('.restaurant').html(`
        <h2>${name}</h2>
        ${urlHTML}
        <p>Phone: ${phoneNumber}</p>
        <p>Address: </p>
            <ul>
                ${addressHTML}
            </ul>
        <p>Categories: </p>
            <ul>
                ${categoriesHTML}
            </ul>
        ${priceHTML}
        ${menuHTML}
        ${ratingHTML}
        <p>Hours: </p>
            <ul>
                ${hoursHTML}
            </ul>
        <p>More about this restaurant: </p>
            <ul>
                ${attributesHTML}
            </ul>
    `);
    if (latLong) {
        $('.restaurant').append(`
            <form id="directions-form">
                <fieldset>
                    <legend>If you'd like directions, please provide an address for the point of departure</legend>
                    <label for="mode">Mode of travel: </label>
                    <select id="mode">
                        <option value="fastest">Driving</option>
                        <option value="pedestrian">Walking</option>
                        <option value="bicycle">Cycling</option>
                    </select>
                    <label for="street">Street: </label>
                    <input type="text" id="street" required>
                    <label for="city">City: </label>
                    <input type="text" id="city" required>
                    <label for="state">State: </label>
                    <input type="text" id="state" required>
                    <button type="submit">Find Directions</button>
                </fieldset>
            </form>
        
            <div class="directions">
        
            </div>
        `);
        $('#directions-form').submit(event => {
            event.preventDefault();
            fetchDirections(latLong);
        });
    } else {
        $('.restaurant').append("<p>Sorry, directions not available for this location.</p>");
    }
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
        return "<p>Restaurant url not available</p>";
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
                    attributesHTMLArray.push(`<li>${item.displayName}: ${item.displayValue}</li>`);
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
                hoursHTMLArray.push(
                    `
                    <li>${object.days}: ${timesArray.join(', ')}</li>
                    `
                );
            }
            return hoursHTMLArray.join('\r');
        }
        catch(e) {
            return "<li>Sorry, hours not available.</li>"
        }
    } else {
        return "<li>Sorry, hours not available.</li>"
    }
}

function fetchMenuHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('hasMenu')) {
        if (restaurantInfo.hasMenu) {
            return `<a href="${restaurantInfo.menu.url}" target="_blank">View Menu on Foursquare</a>`
        } else {
            return "<p>Menu not available.</p>"
        }
    } else {
        return "<p>Menu not available.</p>";
    }
}

function fetchRestaurantRatingHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('rating')) {
        return `<p>Rating: ${restaurantInfo.rating}</p>`
    } else {
        return "<p>Rating not available</p>";
    }
}

function fetchPriceHTML(restaurantInfo, restaurantInfoKeys) {
    if (restaurantInfoKeys.includes('price')) {
        switch (restaurantInfo.price.tier) {
            case 1:
                return "<p>The average price per entree is less than $10</p>";
            case 2:
                return "<p>The average price per entree is $10-$20</p>";
            case 3:
                return "<p>The average price per entree is $20-$30</p>";
            case 4:
                return "<p>The average price per entree is more than $30</p>";
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
        return "<li>Sorry, no categories available</li>"
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
            return "<p>Address not available.</p>"
        }
    } else {
        return "<p>Address not available.</p>";
    }
}

function pickRestaurant() {
    const randomNum = Math.floor(Math.random() * restaurantQueryResults.length);
    const randomRestaurant = restaurantQueryResults[randomNum];
    console.log(randomRestaurant);
    fetchRestaurantDetails(randomRestaurant.venue.id);
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
    return distance * 1609;
}

$(handleForm);


// var myHeaders = new Headers();
// myHeaders.append("user-key", "802a0f9c5cac8e2659203aefe4f3a1fd");

// var requestOptions = {
//   method: 'GET',
//   headers: myHeaders,
//   redirect: 'follow'
// };

// fetch("https://developers.zomato.com/api/v2.1/cities?q=Shippensburg", requestOptions)
//   .then(response => response.json())
//   .then(result => console.log(result))
//   .catch(error => console.log('error', error));

// $(fetch("https://www.mapquestapi.com/directions/v2/route?key=Nm7BvCgkqE4CwDRloh8s14FNG4NPdjSp&from=4693 Smith Dr, Bethlehem, PA&to=39.41415307361944,-77.410567890517")
// .then(response => response.json())
// .then(result => console.log(result))
// .catch(error => console.log('error', error)));