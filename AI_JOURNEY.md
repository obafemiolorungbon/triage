## 3 Complex Prompts 

1. Bootstrapping: In order to bootstrap the Nx workspace, I sent a prompt that was aware of the whole plan and bootstrapped the Nx Workspace in about 2-3 tries. 

2. Design Change: After the first basic UI, I added multiple skills (from skills.sh) to the prompt and it resulted in a more polished consistent UI. skills include, frontend-design, ui-ux-pro-max and webdesign guidelines

3. When Implementing the queue, i wrote an extensive prompt to ensure that two separate queues were created and also the workers can be viewd via bull mq visualizer.


## AI Hallucination

When creating the UI of the app, due to the skills added, the AI had halluciated and added a landing page, and a whole lot of copies to the screens even when not required or explicitly required.Therefore, in the Rules section of cursor, I added an instruction to adhere to strict UI copies and not add unnecessary code.


## Verification Task

1. How would you implement RBAC if we added Admins and Read Only users?
- I added a RBAC implementation from ground up since it is easier to add this before than after building, the current implmentation features a RBAC approach with agent and admin roles currently available.

2. What happens to your system if the LLM API goes down? How did you design your API to handle this gracefully?

- By using a queue/worker approach, no review is ever lost, instead, when they fail, they are persisted in the queue and can be retried at once, and subsquently through the UI. I also used the openRouter approach too as it always uses the model that are up and running.

## Extras

My Planning started from the drawing board, you can see my architectural thinking and decision in the /planning folder, which documents the questions and the reasons why i made the decisions that i made.


## TODO

Here are list of things I would implement if a complete product was a requirement.

1. Notification via email: Currently, we have a third party integration to send emails for urgent triaged tickets and for when tickets are resolved. I will complete this end to end in a full product.

2. Analytics: There will be analytics for better view of daily tickets and numbers required by agents.