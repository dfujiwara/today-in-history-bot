/*
global muxbots
*/

muxbots.onFeedPull((callback) => {
  handleOnFeedPull(callback)
})

const handleOnFeedPull = async (callback) => {
  if (!shouldFetch()) {
    muxbots.newResponse()
      .addNoResultsMessage('No more for today, come back tomorrow!')
      .send(callback)
    return
  }

  try {
    const url = createURL()
    let pageContent = await fetchWikipediaPage(url)
    let selectedEvents = parsePage(pageContent)
    let response = muxbots.newResponse()
    selectedEvents.forEach((event) => {
      response.addMessage(event)
    })
    response.addWebpageSmall(muxbots.newWebpage()
      .setURL(url)
      .setTitle(`Browse more events for `)
      .setImage('https://www.wikipedia.org/static/apple-touch/wikipedia.png'))
    response.send(callback)

    const currentDate = new Date()
    muxbots.localStorage.setItem('lastFetchDate', currentDate.toDateString())
  } catch (error) {
    console.log(error)
    muxbots.newResponse()
      .addNoResultsMessage('An issue occurred while fetching wikipedia page')
      .send(callback)
  }
}

const createURL = () => {
  const monthStringMap = {
    0: 'January',
    1: 'February',
    2: 'March',
    3: 'April',
    4: 'May',
    5: 'June',
    6: 'July',
    7: 'August',
    8: 'September',
    9: 'October',
    10: 'November',
    11: 'December'
  }
  let date = new Date()
  let monthString = monthStringMap[date.getMonth()]
  let dateString = `${monthString}_${date.getDate()}`
  const url = `https://en.wikipedia.org/wiki/${dateString}#Events`
  return url
}

const shouldFetch = () => {
  const lastFetchDate = muxbots.localStorage.getItem('lastFetchDate')
  if (lastFetchDate === undefined) {
    return true
  }
  const currentDate = new Date()
  const currentDateWithSign = currentDate.toDateString()
  return (currentDateWithSign !== lastFetchDate)
}

const fetchWikipediaPage = (url) => {
  return new Promise((resolve, reject) => {
    muxbots.http.get(url, (response) => {
      if (!response.data) {
        reject(response.error)
      }
      resolve(response.data)
    })
  })
}

const parsePage = (pageContent) => {
  let items = pageContent.split('<span class="mw-headline" id="Events">')
  items.shift()
  const eventSection = items.shift()
  items = eventSection.split('</ul>')
  const parsedEventSection = items.shift()
  const parsedEvents = parsedEventSection.split('<li>')
  parsedEvents.shift()

  let eventInfoArray = []
  eventInfoArray.push({index: parsedEvents.length - 1, event: parsedEvents[parsedEvents.length - 1]})
  eventInfoArray = eventInfoArray.concat([0, 1].map((counter) => {
    // Make sure that the random index doesn't pick the last element, as it is
    // always included. We don't want to duplicate the last element twice.
    const index = Math.floor(Math.random() * (parsedEvents.length - 1))
    const events = parsedEvents.splice(index, 1)
    return {index, event: events[0]}
  }))
  eventInfoArray = eventInfoArray.sort((first, second) => {
    return first.index - second.index
  })
  return eventInfoArray.map((eventInfo) => {
    let eventString = eventInfo.event
      .replace(/<\/[^>]*>/g, '')
      .replace(/<[^>]*>/g, '')
    return eventString.trim()
  })
}
