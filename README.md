# @dab-co/jam-mqtt

## Errors
Errors that occur from client's data are written to /user_id/devices/client_id with qos 0.

### Example error format
```JSON
{
  "type": "error",
  "handler": "authenticate",
  "category": "api_token",
  "message": "wrong api token",
  "messageId": null
}
```

### Errors thrown by handlers

#### preConnect
- Spam
  - too many failed auth attempts

#### authenticate
- id
  - client id and user id don't match

- api_token
  - wrong api token format
 
    Raised when api token is empty
  - unknown user id
  - wrong api token 

- logout
  - a new device has connected, logout from this device

#### authorizePublish
- topic
  - not enough topic levels
  - wildcards are not allowed in topic
  - can't publish to other user's channel except inbox

- notification_token
  - fatal database error
  
  Raised when no column for notification token exists in database, could mean that there is a bigger issue in server

- friends
  - not friends with the receiver

#### authorizeSubscribe
The category field here is set to the topic user tries subscribing to

- wildcards are not allowed in topic
- not enough topic levels
- not authorized
